<?php

namespace App\Http\Controllers\Api\Public;

use App\Http\Controllers\Controller;
use App\Http\Resources\JobCardResource;
use App\Models\ContactAccessLog;
use App\Models\Job;
use App\Models\JobView;
use App\Models\SearchLog;
use App\Services\Analytics;
use App\Services\JobSearch;
use App\Services\Settings;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Str;

class JobController extends Controller
{
    private const FILTER_KEYS = [
        'q', 'title', 'company', 'category', 'role', 'locality', 'area', 'pincode', 'state',
        'salary_min', 'salary_max', 'salary_period', 'salary_type', 'negotiable', 'type', 'work_mode',
        'experience', 'education', 'gender', 'immediate', 'min_vacancies', 'shift', 'weekly_off', 'posted',
        'sort', 'near', 'page', 'per_page', 'employer',
    ];

    public function __construct(private JobSearch $search) {}

    public function index(Request $request): JsonResponse
    {
        $request->validate([
            'q' => ['nullable', 'string', 'max:100'], 'page' => ['nullable', 'integer', 'min:1', 'max:500'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:50'],
            'sort' => ['nullable', 'in:latest,salary,relevance,location'],
            'posted' => ['nullable', 'in:24h,7d,30d'],
            'salary_min' => ['nullable', 'numeric', 'min:0'], 'salary_max' => ['nullable', 'numeric', 'min:0'],
        ]);
        $filters = array_filter($request->only(self::FILTER_KEYS), fn ($v) => $v !== null && $v !== '' && $v !== []);
        if (! empty($filters['employer'])) {   // company page: filter by employer slug
            $filters['employer_id'] = \App\Models\EmployerProfile::where('slug', $filters['employer'])->value('user_id') ?? 0;
            unset($filters['employer']);
        }

        $payload = Cache::remember(JobSearch::cacheKey($filters), 60, function () use ($filters) {
            $page = $this->search->search($filters);
            $page->getCollection()->load('employerProfile:id,user_id,slug,verified_at');

            return [
                'data' => JobCardResource::collection($page->getCollection())->resolve(),
                'meta' => ['current_page' => $page->currentPage(), 'last_page' => $page->lastPage(), 'per_page' => $page->perPage(), 'total' => $page->total()],
            ];
        });

        // Log real searches (not plain pagination of the homepage) for analytics
        $searchFilters = array_diff_key($filters, array_flip(['page', 'per_page', 'sort']));
        if ($searchFilters && (int) ($filters['page'] ?? 1) === 1) {
            SearchLog::create([
                'keyword' => isset($filters['q']) ? Str::limit(Str::lower(trim($filters['q'])), 150, '') : null,
                'filters' => $searchFilters, 'results_count' => $payload['meta']['total'],
                'user_id' => $request->user('sanctum')?->id, 'session_hash' => Analytics::sessionHash($request),
            ]);
        }

        return response()->json($payload)->header('Cache-Control', 'public, max-age=30, s-maxage=60');
    }

    public function show(int $id): JsonResponse
    {
        $data = Cache::remember('job:public:'.$id.':v'.cache('jobs:version', 1), 120, function () use ($id) {
            $job = Job::with(['category', 'role', 'locality', 'educationLevel', 'skills', 'questions', 'employerProfile'])->find($id);
            if (! $job || ! in_array($job->status, ['active', 'expired', 'closed'], true)) {
                return null;
            }

            return (new JobCardResource($job))->withDetail()->resolve();
        });

        if (! $data) {
            return response()->json(['message' => 'Job not found.'], 404);
        }

        return response()->json(['data' => $data])->header('Cache-Control', 'public, max-age=60, s-maxage=120');
    }

    public function similar(int $id): JsonResponse
    {
        $job = Job::find($id);
        if (! $job) {
            return response()->json(['data' => []]);
        }
        $data = Cache::remember('job:similar:'.$id.':v'.cache('jobs:version', 1), 300, function () use ($job) {
            $items = $this->search->query(['category' => (string) $job->job_category_id, 'exclude' => $job->id, 'sort' => 'latest'])->limit(6)->get();
            if ($items->count() < 3) {
                $items = $items->merge($this->search->query(['locality' => (string) $job->locality_id, 'exclude' => $job->id])->limit(6 - $items->count())->get())->unique('id');
            }

            return JobCardResource::collection($items)->resolve();
        });

        return response()->json(['data' => $data]);
    }

    /** Beacon from the job page: counts a view once per visitor per day. */
    public function recordView(Request $request, int $id): JsonResponse
    {
        $job = Job::publiclyVisible()->find($id);
        if (! $job) {
            return response()->json([], 204);
        }
        $hash = Analytics::sessionHash($request);
        if (Cache::add('jobview:'.$id.':'.$hash, 1, now()->endOfDay())) {
            JobView::create(['job_id' => $id, 'user_id' => $request->user('sanctum')?->id, 'session_hash' => $hash]);
            Job::whereKey($id)->increment('views_count');
        }

        return response()->json([], 204);
    }

    /**
     * PRIVATE employer contact details. Only for logged-in, verified, active job seekers (or admins),
     * subject to the job's contact_visibility. Rate-limited and every reveal is logged.
     */
    public function contact(Request $request, int $id, Settings $settings): JsonResponse
    {
        $user = $request->user();
        $job = Job::find($id);
        if (! $job || ! $job->isPubliclyVisible()) {
            return response()->json(['message' => 'Job not found.'], 404);
        }

        $isAdmin = $user->hasPermission('jobs.view');
        if (! $isAdmin) {
            if (! $user->isJobSeeker()) {
                return response()->json(['message' => 'Only registered job seekers can view employer contact details.'], 403);
            }
            if ($job->contact_visibility === 'hidden') {
                return response()->json(['message' => 'This employer accepts applications only through SuratRojgar. Please use "Apply Now".', 'code' => 'contact_hidden'], 403);
            }
            if ($job->contact_visibility === 'applicants_only' && ! $job->applications()->where('user_id', $user->id)->exists()) {
                return response()->json(['message' => 'The employer shares contact details after you apply for this job.', 'code' => 'apply_first'], 403);
            }
            $limit = (int) $settings->get('contact_views_per_day');
            $today = ContactAccessLog::where('user_id', $user->id)->where('created_at', '>=', now()->startOfDay())->distinct()->count('job_id');
            $alreadySeen = ContactAccessLog::where('user_id', $user->id)->where('job_id', $id)->where('created_at', '>=', now()->startOfDay())->exists();
            if (! $alreadySeen && $today >= $limit) {
                return response()->json(['message' => 'You have reached today\'s limit for viewing employer contacts. Please try again tomorrow.'], 429);
            }
        }

        ContactAccessLog::create(['user_id' => $user->id, 'job_id' => $id, 'ip' => $request->ip(), 'user_agent' => Str::limit((string) $request->userAgent(), 250, '')]);

        return response()->json(['data' => [
            'contact_name' => $job->contact_name,
            'contact_mobile' => $job->contact_mobile,
            'contact_email' => $job->contact_email,
            'office_address' => $job->office_address,
            'company' => $job->company_display_name,
        ]])->header('Cache-Control', 'private, no-store');
    }
}
