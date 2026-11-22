<?php

namespace App\Support;

use Carbon\CarbonImmutable;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

/** Report date ranges, interpreted in the display timezone (IST) and converted to UTC for queries. */
final class DateRange
{
    public const PRESETS = ['today', 'yesterday', 'last_7_days', 'last_30_days', 'this_month', 'previous_month', 'this_year', 'previous_year', 'custom'];

    public function __construct(public CarbonImmutable $start, public CarbonImmutable $end, public string $preset) {}

    public static function fromRequest(Request $request, string $default = 'last_30_days'): self
    {
        $tz = config('app.display_timezone');
        $preset = $request->input('range', $default);
        $now = CarbonImmutable::now($tz);

        [$s, $e] = match ($preset) {
            'today' => [$now->startOfDay(), $now->endOfDay()],
            'yesterday' => [$now->subDay()->startOfDay(), $now->subDay()->endOfDay()],
            'last_7_days' => [$now->subDays(6)->startOfDay(), $now->endOfDay()],
            'this_month' => [$now->startOfMonth(), $now->endOfDay()],
            'previous_month' => [$now->subMonthNoOverflow()->startOfMonth(), $now->subMonthNoOverflow()->endOfMonth()],
            'this_year' => [$now->startOfYear(), $now->endOfDay()],
            'previous_year' => [$now->subYear()->startOfYear(), $now->subYear()->endOfYear()],
            'custom' => self::custom($request, $tz),
            default => [$now->subDays(29)->startOfDay(), $now->endOfDay()],
        };

        return new self($s->utc(), $e->utc(), in_array($preset, self::PRESETS, true) ? $preset : 'last_30_days');
    }

    private static function custom(Request $request, string $tz): array
    {
        $from = $request->input('from');
        $to = $request->input('to');
        try {
            $s = CarbonImmutable::createFromFormat('Y-m-d', (string) $from, $tz)->startOfDay();
            $e = CarbonImmutable::createFromFormat('Y-m-d', (string) $to, $tz)->endOfDay();
        } catch (\Throwable) {
            throw ValidationException::withMessages(['from' => 'Please choose a valid start and end date.']);
        }
        if ($e->lt($s)) {
            throw ValidationException::withMessages(['to' => 'End date must be after start date.']);
        }
        if ($s->diffInDays($e) > 1100) {
            throw ValidationException::withMessages(['to' => 'Please choose a range of 3 years or less.']);
        }

        return [$s, $e];
    }

    /** SQL expression grouping a UTC timestamp column by IST day (no tz tables needed). */
    public static function istDay(string $column): string
    {
        return "DATE(CONVERT_TZ({$column}, '+00:00', '+05:30'))";
    }

    public function days(): array
    {
        $out = [];
        $tz = config('app.display_timezone');
        for ($d = $this->start->setTimezone($tz)->startOfDay(); $d->lte($this->end->setTimezone($tz)); $d = $d->addDay()) {
            $out[] = $d->toDateString();
        }

        return $out;
    }

    public function toArray(): array
    {
        $tz = config('app.display_timezone');

        return ['preset' => $this->preset, 'from' => $this->start->setTimezone($tz)->toDateString(), 'to' => $this->end->setTimezone($tz)->toDateString()];
    }
}
