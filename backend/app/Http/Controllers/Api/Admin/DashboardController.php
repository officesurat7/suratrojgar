<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Api\Employer\EmployerController;
use App\Http\Controllers\Controller;
use App\Models\AnalyticsDaily;
use App\Models\VisitorEvent;
use App\Services\Audit;
use App\Support\DateRange;
use App\Support\Options;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class DashboardController extends Controller
{
    public const DIMENSIONS = ['day', 'job', 'employer', 'locality', 'category', 'role', 'salary_range', 'employment_type', 'education', 'experience', 'status'];

    public function stats(): JsonResponse
    {
        $data = Cache::remember('admin:stats', 300, function () {
            $tz = config('app.display_timezone');
            $today = now($tz)->startOfDay()->utc();
            $week = now($tz)->startOfWeek()->utc();
            $month = now($tz)->startOfMonth()->utc();
            $users = DB::table('users')->whereNull('deleted_at');
            $jobs = DB::table('jobs')->whereNull('deleted_at');
            $apps = DB::table('applications');
            $todayVisitors = VisitorEvent::where('created_at', '>=', $today);

            return [
                'visitors_total' => (int) AnalyticsDaily::where('metric', 'unique_visitors')->sum('value') + (clone $todayVisitors)->distinct()->count('session_hash'),
                'page_views_total' => (int) AnalyticsDaily::where('metric', 'page_views')->sum('value') + (clone $todayVisitors)->count(),
                'unique_visitors_today' => (clone $todayVisitors)->distinct()->count('session_hash'),
                'unique_visitors_30d' => (int) AnalyticsDaily::where('metric', 'unique_visitors')->where('date', '>=', now($tz)->subDays(29)->toDateString())->sum('value'),
                'job_seekers_total' => (clone $users)->where('user_type', 'job_seeker')->count(),
                'employers_total' => (clone $users)->where('user_type', 'employer')->count(),
                'job_seekers_active' => (clone $users)->where('user_type', 'job_seeker')->where('status', 'active')->count(),
                'employers_active' => (clone $users)->where('user_type', 'employer')->where('status', 'active')->count(),
                'employers_pending' => (clone $users)->where('user_type', 'employer')->where('status', 'pending')->whereNotNull('email_verified_at')->count(),
                'jobs_total' => (clone $jobs)->count(),
                'jobs_active' => (clone $jobs)->where('status', 'active')->where(fn ($w) => $w->whereNull('expires_at')->orWhere('expires_at', '>', now()))->count(),
                'jobs_pending' => (clone $jobs)->where('status', 'pending')->count(),
                'jobs_expired' => (clone $jobs)->where(fn ($w) => $w->where('status', 'expired')->orWhere(fn ($x) => $x->where('status', 'active')->where('expires_at', '<=', now())))->count(),
                'applications_total' => (clone $apps)->count(),
                'applications_today' => (clone $apps)->where('created_at', '>=', $today)->count(),
                'applications_week' => (clone $apps)->where('created_at', '>=', $week)->count(),
                'applications_month' => (clone $apps)->where('created_at', '>=', $month)->count(),
                'shortlisted_total' => (clone $apps)->whereIn('status', ['shortlisted', 'interview_scheduled', 'interview_completed'])->count(),
                'selected_total' => (clone $apps)->where('status', 'selected')->count(),
                'complaints_open' => DB::table('complaints')->whereIn('status', ['open', 'in_review'])->count(),
                'data_requests_pending' => DB::table('data_requests')->where('status', 'pending')->count(),
                'generated_at' => now()->toIso8601String(),
            ];
        });

        return response()->json($data);
    }

    public function charts(Request $request): JsonResponse
    {
        $range = DateRange::fromRequest($request);
        $key = 'admin:charts:'.md5(json_encode($range->toArray()));
        $data = Cache::remember($key, 300, function () use ($range) {
            $day = fn (string $table, ?callable $scope = null) => DB::table($table)
                ->whereBetween('created_at', [$range->start, $range->end])
                ->when($scope, $scope)
                ->selectRaw(DateRange::istDay('created_at').' d, COUNT(*) c')->groupBy('d')->pluck('c', 'd');

            $apps = $day('applications');
            $seekers = $day('users', fn ($q) => $q->where('user_type', 'job_seeker'));
            $employers = $day('users', fn ($q) => $q->where('user_type', 'employer'));
            $jobs = DB::table('jobs')->whereBetween('published_at', [$range->start, $range->end])
                ->selectRaw(DateRange::istDay('published_at').' d, COUNT(*) c')->groupBy('d')->pluck('c', 'd');
            $visitors = $this->dailyMetric('unique_visitors', $range);
            $views = $this->dailyMetric('page_views', $range);

            $series = array_map(fn ($d) => [
                'date' => $d,
                'applications' => (int) ($apps[$d] ?? 0),
                'job_seekers' => (int) ($seekers[$d] ?? 0),
                'employers' => (int) ($employers[$d] ?? 0),
                'jobs_posted' => (int) ($jobs[$d] ?? 0),
                'visitors' => (int) ($visitors[$d] ?? 0),
                'page_views' => (int) ($views[$d] ?? 0),
            ], $range->days());

            $statusBreakdown = DB::table('applications')->whereBetween('created_at', [$range->start, $range->end])
                ->selectRaw('status, COUNT(*) c')->groupBy('status')->pluck('c', 'status');

            return ['range' => $range->toArray(), 'series' => $series, 'application_status' => $statusBreakdown->all()];
        });

        return response()->json($data);
    }

    /** Job application analytics grouped by a dimension. */
    public function applicationReport(Request $request): JsonResponse
    {
        $request->validate(['dimension' => ['required', Rule::in(self::DIMENSIONS)]]);
        $range = DateRange::fromRequest($request);

        return response()->json(['range' => $range->toArray(), 'dimension' => $request->dimension, 'rows' => $this->applicationRows($request->dimension, $range)]);
    }

    private function applicationRows(string $dim, DateRange $range, int $limit = 100): array
    {
        $q = DB::table('applications as a')->join('jobs as j', 'j.id', '=', 'a.job_id')
            ->whereBetween('a.created_at', [$range->start, $range->end]);

        $salaryCase = "CASE WHEN j.salary_monthly_max IS NULL THEN 'Not disclosed'
            WHEN j.salary_monthly_max < 10000 THEN 'Below ₹10k' WHEN j.salary_monthly_max < 15000 THEN '₹10k–15k'
            WHEN j.salary_monthly_max < 25000 THEN '₹15k–25k' WHEN j.salary_monthly_max < 40000 THEN '₹25k–40k'
            WHEN j.salary_monthly_max < 75000 THEN '₹40k–75k' ELSE '₹75k+' END";
        $expCase = "CASE WHEN p.experience_years IS NULL OR p.experience_years = 0 THEN 'Fresher'
            WHEN p.experience_years < 1 THEN '0–1 year' WHEN p.experience_years < 3 THEN '1–3 years'
            WHEN p.experience_years < 5 THEN '3–5 years' WHEN p.experience_years < 10 THEN '5–10 years' ELSE '10+ years' END";

        $rows = match ($dim) {
            'day' => $q->selectRaw(DateRange::istDay('a.created_at').' label, COUNT(*) value')->groupBy('label')->orderBy('label'),
            'job' => $q->selectRaw("CONCAT(j.title, ' (#', j.id, ')') label, COUNT(*) value")->groupBy('j.id', 'j.title')->orderByDesc('value'),
            'employer' => $q->selectRaw('j.company_display_name label, COUNT(*) value')->groupBy('j.employer_id', 'j.company_display_name')->orderByDesc('value'),
            'locality' => $q->leftJoin('localities as l', 'l.id', '=', 'j.locality_id')->selectRaw("COALESCE(l.name, 'Not set') label, COUNT(*) value")->groupBy('label')->orderByDesc('value'),
            'category' => $q->leftJoin('job_categories as c', 'c.id', '=', 'j.job_category_id')->selectRaw("COALESCE(c.name, 'Not set') label, COUNT(*) value")->groupBy('label')->orderByDesc('value'),
            'role' => $q->leftJoin('job_roles as r', 'r.id', '=', 'j.job_role_id')->selectRaw("COALESCE(r.name, 'Not set') label, COUNT(*) value")->groupBy('label')->orderByDesc('value'),
            'salary_range' => $q->selectRaw("{$salaryCase} label, COUNT(*) value")->groupBy('label')->orderByDesc('value'),
            'employment_type' => $q->selectRaw('j.employment_type label, COUNT(*) value')->groupBy('label')->orderByDesc('value'),
            'education' => $q->leftJoin('job_seeker_profiles as p', 'p.user_id', '=', 'a.user_id')->leftJoin('education_levels as e', 'e.id', '=', 'p.education_level_id')
                ->selectRaw("COALESCE(e.name, 'Not set') label, COUNT(*) value")->groupBy('label')->orderByDesc('value'),
            'experience' => $q->leftJoin('job_seeker_profiles as p', 'p.user_id', '=', 'a.user_id')->selectRaw("{$expCase} label, COUNT(*) value")->groupBy('label')->orderByDesc('value'),
            'status' => $q->selectRaw('a.status label, COUNT(*) value')->groupBy('label')->orderByDesc('value'),
        };

        return $rows->limit($limit)->get()->map(function ($r) use ($dim) {
            $label = $r->label;
            if ($dim === 'employment_type') {
                $label = Options::EMPLOYMENT_TYPES[$label] ?? $label;
            } elseif ($dim === 'status') {
                $label = Options::APPLICATION_STATUSES[$label] ?? $label;
            }

            return ['label' => (string) $label, 'value' => (int) $r->value];
        })->all();
    }

    /** Visitor analytics. All figures are estimates from anonymous, privacy-preserving counting. */
    public function visitorReport(Request $request): JsonResponse
    {
        $range = DateRange::fromRequest($request);
        $from = $range->start->setTimezone(config('app.display_timezone'))->toDateString();
        $to = $range->end->setTimezone(config('app.display_timezone'))->toDateString();
        $dims = fn (string $metric, int $limit = 20) => AnalyticsDaily::where('metric', $metric)->whereBetween('date', [$from, $to])
            ->selectRaw('dimension label, SUM(value) value')->groupBy('dimension')->orderByDesc('value')->limit($limit)->get()
            ->map(fn ($r) => ['label' => $r->label, 'value' => (int) $r->value]);

        $views = $this->dailyMetric('page_views', $range);
        $uniques = $this->dailyMetric('unique_visitors', $range);
        $months = [];
        foreach ($range->days() as $d) {
            $m = substr($d, 0, 7);
            $months[$m]['visitors'] = ($months[$m]['visitors'] ?? 0) + (int) ($uniques[$d] ?? 0);
            $months[$m]['page_views'] = ($months[$m]['page_views'] ?? 0) + (int) ($views[$d] ?? 0);
        }

        $mostViewedJobs = DB::table('job_views as v')->join('jobs as j', 'j.id', '=', 'v.job_id')
            ->whereBetween('v.created_at', [$range->start, $range->end])
            ->selectRaw("CONCAT(j.title, ' — ', j.company_display_name) label, COUNT(*) value")->groupBy('j.id', 'j.title', 'j.company_display_name')
            ->orderByDesc('value')->limit(20)->get();

        return response()->json([
            'range' => $range->toArray(),
            'note' => 'Visitor figures are estimates based on anonymous daily counting (no IP addresses are stored). Registered-user numbers elsewhere are verified account data.',
            'daily' => array_map(fn ($d) => ['date' => $d, 'visitors' => (int) ($uniques[$d] ?? 0), 'page_views' => (int) ($views[$d] ?? 0)], $range->days()),
            'monthly' => collect($months)->map(fn ($v, $k) => ['month' => $k] + $v)->values(),
            'totals' => ['visitors' => array_sum(array_map('intval', $uniques)), 'page_views' => array_sum(array_map('intval', $views)),
                'searches' => (int) AnalyticsDaily::where('metric', 'searches')->whereBetween('date', [$from, $to])->sum('value')],
            'popular_pages' => $dims('path'),
            'search_keywords' => $dims('search_keyword', 30),
            'devices' => $dims('device'),
            'browsers' => $dims('browser'),
            'sources' => $dims('source'),
            'most_viewed_jobs' => $mostViewedJobs,
            'cities' => [],
            'cities_note' => 'City-level visitor data needs a licensed GeoIP database and is disabled by default. See docs/ANALYTICS.md. For verified locations use the registered candidates report.',
            'registered_by_locality' => DB::table('job_seeker_profiles as p')->join('users as u', 'u.id', '=', 'p.user_id')->leftJoin('localities as l', 'l.id', '=', 'p.locality_id')
                ->whereNull('u.deleted_at')->selectRaw("COALESCE(l.name, 'Not set') label, COUNT(*) value")->groupBy('label')->orderByDesc('value')->limit(30)->get(),
        ]);
    }

    public function export(Request $request)
    {
        $request->validate(['report' => ['required', Rule::in(['applications', 'visitors'])], 'dimension' => ['nullable', Rule::in(self::DIMENSIONS)]]);
        $range = DateRange::fromRequest($request);
        $rows = $request->report === 'applications'
            ? $this->applicationRows($request->input('dimension', 'day'), $range, 5000)
            : array_map(fn ($d) => ['label' => $d['date'], 'value' => $d['visitors'], 'page_views' => $d['page_views']], json_decode($this->visitorReport($request)->getContent(), true)['daily']);
        Audit::log('report.exported', null, [], ['report' => $request->report, 'dimension' => $request->dimension] + $range->toArray());

        return response()->streamDownload(function () use ($rows, $request) {
            $out = fopen('php://output', 'w');
            fputcsv($out, $request->report === 'applications' ? [ucfirst(str_replace('_', ' ', $request->input('dimension', 'day'))), 'Applications'] : ['Date', 'Visitors (est.)', 'Page views']);
            foreach ($rows as $r) {
                fputcsv($out, array_map([EmployerController::class, 'csvSafe'], array_values($r)));
            }
            fclose($out);
        }, "{$request->report}-report-".now()->format('Ymd').'.csv', ['Content-Type' => 'text/csv']);
    }

    /** Daily metric from rollups, plus today's live figure. */
    private function dailyMetric(string $metric, DateRange $range): array
    {
        $tz = config('app.display_timezone');
        $from = $range->start->setTimezone($tz)->toDateString();
        $to = $range->end->setTimezone($tz)->toDateString();
        $vals = AnalyticsDaily::where('metric', $metric)->where('dimension', '')->whereBetween('date', [$from, $to])
            ->get(['date', 'value'])->mapWithKeys(fn ($r) => [$r->date->toDateString() => (int) $r->value])->all();
        $today = now($tz)->toDateString();
        if ($today >= $from && $today <= $to) {
            $q = VisitorEvent::where('created_at', '>=', now($tz)->startOfDay()->utc());
            $vals[$today] = $metric === 'unique_visitors' ? $q->distinct()->count('session_hash') : $q->count();
        }

        return $vals;
    }
}
