<?php

namespace App\Http\Controllers\Api\Public;

use App\Http\Controllers\Controller;
use App\Http\Resources\EmployerProfileResource;
use App\Models\Complaint;
use App\Models\EmployerProfile;
use App\Models\HomepageSlider;
use App\Models\Job;
use App\Models\JobCategory;
use App\Models\JobRole;
use App\Models\Locality;
use App\Notifications\AdminAlertNotification;
use App\Services\Analytics;
use App\Services\Settings;
use App\Support\Options;
use App\Support\Rules;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class SiteController extends Controller
{
    public function sliders(): JsonResponse
    {
        $data = Cache::remember('sliders:public', 600, fn () => HomepageSlider::where('is_active', true)
            ->where(fn ($w) => $w->whereNull('starts_at')->orWhere('starts_at', '<=', now()))
            ->where(fn ($w) => $w->whereNull('ends_at')->orWhere('ends_at', '>', now()))
            ->orderBy('sort_order')->get()
            ->map(fn ($s) => [
                'id' => $s->id, 'title' => $s->title, 'subtitle' => $s->subtitle, 'theme' => $s->theme,
                'image_url' => $s->image_path ? Storage::disk('public')->url($s->image_path) : null,
                'mobile_image_url' => $s->mobile_image_path ? Storage::disk('public')->url($s->mobile_image_path) : null,
                'cta_label' => $s->cta_label, 'cta_url' => $s->cta_url,
            ])->all());

        return response()->json(['data' => $data])->header('Cache-Control', 'public, max-age=120, s-maxage=600');
    }

    public function company(string $slug): JsonResponse
    {
        $profile = EmployerProfile::with(['locality', 'businessCategory', 'user'])->where('slug', $slug)->first();
        if (! $profile || ! $profile->user || ! in_array($profile->user->status, ['active'], true)) {
            return response()->json(['message' => 'Company not found.'], 404);
        }
        $activeJobs = Job::publiclyVisible()->where('employer_id', $profile->user_id)->count();

        return response()->json(['data' => (new EmployerProfileResource($profile))->resolve() + ['active_jobs' => $activeJobs]]);
    }

    public function track(Request $request, Analytics $analytics, Settings $settings): JsonResponse
    {
        $data = $request->validate([
            'path' => ['required', 'string', 'max:255', 'starts_with:/'],
            'page_type' => ['nullable', 'string', 'max:30', 'alpha_dash'],
            'referrer' => ['nullable', 'string', 'max:500'],
            'utm_source' => ['nullable', 'string', 'max:100'],
        ]);
        if ($settings->get('analytics_enabled') && $request->header('DNT') !== '1' && $request->header('Sec-GPC') !== '1') {
            $data['referrer'] ??= null;
            $analytics->track($request, $data);
        }

        return response()->json([], 204);
    }

    /** Contact support, grievances, and reports about jobs/employers/candidates. */
    public function submitComplaint(Request $request): JsonResponse
    {
        $user = $request->user('sanctum');
        $data = $request->validate([
            'type' => ['required', Rule::in(Options::COMPLAINT_TYPES)],
            'reason' => ['nullable', Rule::in(array_keys(Options::COMPLAINT_REASONS))],
            'name' => [$user ? 'nullable' : 'required', 'string', 'max:120'],
            'email' => [$user ? 'nullable' : 'required', 'email', 'max:191'],
            'mobile' => ['nullable', 'string', 'max:15'],
            'subject' => ['required', 'string', 'min:3', 'max:200'],
            'description' => ['required', 'string', 'min:10', 'max:5000'],
            'job_id' => ['nullable', 'integer', 'exists:jobs,id'],
            'reported_user_id' => ['nullable', 'integer', 'exists:users,id'],
            'website' => ['prohibited'],   // honeypot field: bots fill it, humans never see it
        ]);
        // Employers/candidates can only be reported by logged-in users
        if ($data['type'] === 'candidate' && ! $user?->isEmployer()) {
            return response()->json(['message' => 'Only employers can report candidates.'], 403);
        }

        $c = Complaint::create([
            'ticket_no' => 'SRT'.now()->format('ymd').strtoupper(Str::random(5)),
            'reporter_id' => $user?->id,
            'reporter_name' => $user?->name ?? Rules::clean($data['name'] ?? null, 120),
            'reporter_email' => $user?->email ?? Str::lower($data['email'] ?? ''),
            'reporter_mobile' => Rules::normaliseMobile($data['mobile'] ?? null),
            'type' => $data['type'], 'reason' => $data['reason'] ?? null,
            'job_id' => $data['job_id'] ?? null, 'reported_user_id' => $data['reported_user_id'] ?? null,
            'subject' => Rules::clean($data['subject'], 200), 'description' => Rules::clean($data['description']),
        ]);
        Notification::send(AdminAlertNotification::recipients('complaints.manage'), new AdminAlertNotification(
            'complaint', 'New '.$data['type'].' ticket '.$c->ticket_no, Str::limit($c->subject, 120), '/admin/complaints'
        ));

        return response()->json(['message' => "Thank you. Your ticket number is {$c->ticket_no}. Our team will respond by email.", 'ticket_no' => $c->ticket_no], 201);
    }

    /** Lightweight data for the Next.js sitemap (only active, indexable pages). */
    public function sitemap(): JsonResponse
    {
        $data = Cache::remember('sitemap:data:v'.cache('jobs:version', 1), 900, fn () => [
            'jobs' => Job::publiclyVisible()->orderByDesc('published_at')->limit(45000)->get(['id', 'slug', 'updated_at'])
                ->map(fn ($j) => ['path' => $j->publicUrlPath(), 'updated_at' => $j->updated_at?->toIso8601String()])->all(),
            // Only list landing pages that actually have jobs (avoid thin/duplicate pages)
            'localities' => Locality::where('is_active', true)->whereHas('jobs', fn ($q) => $q->publiclyVisible())->pluck('slug')->all(),
            'categories' => JobCategory::where('is_active', true)->whereHas('jobs', fn ($q) => $q->publiclyVisible())->pluck('slug')->all(),
            'roles' => JobRole::where('is_active', true)->whereIn('id', Job::publiclyVisible()->select('job_role_id'))->pluck('slug')->all(),
            'companies' => EmployerProfile::whereNotNull('verified_at')->whereIn('user_id', Job::publiclyVisible()->select('employer_id'))->pluck('slug')->all(),
        ]);

        return response()->json($data);
    }
}
