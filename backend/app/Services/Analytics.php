<?php

namespace App\Services;

use App\Models\AnalyticsDaily;
use App\Models\VisitorEvent;
use Carbon\CarbonImmutable;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Redis;
use Illuminate\Support\Str;

/**
 * Privacy-conscious first-party analytics.
 *  - No raw IP addresses are stored; visitors are counted using a salted hash that rotates daily,
 *    so a visitor cannot be tracked across days.
 *  - Events are buffered in Redis and bulk-inserted every minute by the scheduler (no DB write on the request path).
 *  - Dashboards read the analytics_daily rollups; only "today" is computed live.
 */
class Analytics
{
    private const BUFFER = 'analytics:buffer';

    public static function sessionHash(Request $request): string
    {
        $salt = config('app.key').now(config('app.display_timezone'))->toDateString();

        return hash('sha256', $salt.'|'.$request->ip().'|'.Str::limit((string) $request->userAgent(), 200, ''));
    }

    public function track(Request $request, array $data): void
    {
        $ua = (string) $request->userAgent();
        $device = $this->deviceType($ua);
        if ($device === 'bot') {
            return;   // do not count crawlers as visitors
        }
        $refHost = $data['referrer'] ? parse_url($data['referrer'], PHP_URL_HOST) : null;
        $ownHost = parse_url(config('app.frontend_url'), PHP_URL_HOST);
        if ($refHost === $ownHost) {
            $refHost = null;
        }

        $event = [
            'session_hash' => self::sessionHash($request),
            'path' => Str::limit($data['path'], 250, ''),
            'page_type' => $data['page_type'] ?? null,
            'referrer_host' => $refHost ? Str::limit($refHost, 150, '') : null,
            'traffic_source' => $this->source($refHost, $data['utm_source'] ?? null),
            'utm_source' => isset($data['utm_source']) ? Str::limit($data['utm_source'], 100, '') : null,
            'device_type' => $device,
            'browser' => $this->browser($ua),
            'city' => null,   // requires a licensed GeoIP database; intentionally not collected by default
            'user_id' => $request->user()?->id,
            'created_at' => now()->toDateTimeString(),
        ];

        try {
            Redis::rpush(self::BUFFER, json_encode($event));
        } catch (\Throwable) {
            VisitorEvent::insert($event);   // Redis unavailable: degrade gracefully
        }
    }

    public function flush(int $max = 5000): int
    {
        $rows = [];
        try {
            for ($i = 0; $i < $max; $i++) {
                $item = Redis::lpop(self::BUFFER);
                if (! $item) {
                    break;
                }
                $rows[] = json_decode($item, true);
            }
        } catch (\Throwable) {
            return 0;
        }
        foreach (array_chunk($rows, 500) as $chunk) {
            VisitorEvent::insert($chunk);
        }

        return count($rows);
    }

    /** Roll up one day (in display timezone) into analytics_daily. Idempotent. */
    public function rollup(CarbonImmutable $day): void
    {
        $tz = config('app.display_timezone');
        $start = $day->setTimezone($tz)->startOfDay()->utc();
        $end = $start->addDay();
        $date = $day->setTimezone($tz)->toDateString();
        $base = fn () => VisitorEvent::query()->whereBetween('created_at', [$start, $end]);

        $metrics = [
            ['page_views', '', $base()->count()],
            ['unique_visitors', '', $base()->distinct()->count('session_hash')],
        ];
        foreach (['device_type' => 'device', 'browser' => 'browser', 'traffic_source' => 'source', 'page_type' => 'page_type'] as $col => $metric) {
            foreach ($base()->select($col, DB::raw('COUNT(*) c'))->groupBy($col)->get() as $r) {
                $metrics[] = [$metric, (string) ($r->{$col} ?? 'unknown'), $r->c];
            }
        }
        foreach ($base()->select('path', DB::raw('COUNT(*) c'))->groupBy('path')->orderByDesc('c')->limit(50)->get() as $r) {
            $metrics[] = ['path', Str::limit($r->path, 190, ''), $r->c];
        }
        foreach (DB::table('search_logs')->whereBetween('created_at', [$start, $end])->whereNotNull('keyword')
            ->select('keyword', DB::raw('COUNT(*) c'))->groupBy('keyword')->orderByDesc('c')->limit(50)->get() as $r) {
            $metrics[] = ['search_keyword', Str::limit(Str::lower($r->keyword), 190, ''), $r->c];
        }
        $metrics[] = ['searches', '', DB::table('search_logs')->whereBetween('created_at', [$start, $end])->count()];
        $metrics[] = ['job_views', '', DB::table('job_views')->whereBetween('created_at', [$start, $end])->count()];

        DB::transaction(function () use ($date, $metrics) {
            AnalyticsDaily::where('date', $date)->delete();
            $now = now();
            AnalyticsDaily::insert(array_map(fn ($m) => [
                'date' => $date, 'metric' => $m[0], 'dimension' => $m[1], 'value' => $m[2], 'created_at' => $now, 'updated_at' => $now,
            ], $metrics));
        });
    }

    public function deviceType(string $ua): string
    {
        $u = strtolower($ua);
        if ($u === '' || preg_match('/bot|crawl|spider|slurp|facebookexternalhit|preview|headless|curl|wget|python|httpclient/', $u)) {
            return 'bot';
        }
        if (preg_match('/ipad|tablet|kindle|silk|(android(?!.*mobile))/', $u)) {
            return 'tablet';
        }
        if (preg_match('/mobile|iphone|ipod|android|blackberry|opera mini|iemobile/', $u)) {
            return 'mobile';
        }

        return 'desktop';
    }

    public function browser(string $ua): string
    {
        return match (true) {
            str_contains($ua, 'Edg/') => 'Edge',
            str_contains($ua, 'OPR/') || str_contains($ua, 'Opera') => 'Opera',
            str_contains($ua, 'SamsungBrowser') => 'Samsung Internet',
            str_contains($ua, 'Firefox/') || str_contains($ua, 'FxiOS') => 'Firefox',
            str_contains($ua, 'CriOS') || str_contains($ua, 'Chrome/') => 'Chrome',
            str_contains($ua, 'Safari/') => 'Safari',
            default => 'Other',
        };
    }

    private function source(?string $refHost, ?string $utm): string
    {
        if ($utm) {
            return 'campaign';
        }
        if (! $refHost) {
            return 'direct';
        }
        $h = strtolower($refHost);
        if (preg_match('/google\.|bing\.|yahoo\.|duckduckgo\.|yandex\./', $h)) {
            return 'search';
        }
        if (preg_match('/facebook\.|instagram\.|whatsapp\.|wa\.me|t\.co|twitter\.|x\.com|linkedin\.|youtube\.|telegram\./', $h)) {
            return 'social';
        }

        return 'referral';
    }
}
