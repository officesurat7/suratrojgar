<?php

namespace App\Http\Controllers\Api\Seeker;

use App\Http\Controllers\Controller;
use App\Http\Resources\ApplicationResource;
use App\Http\Resources\JobCardResource;
use App\Http\Resources\SeekerProfileResource;
use App\Models\Application;
use App\Models\DataRequest;
use App\Models\Job;
use App\Models\JobView;
use App\Models\Resume;
use App\Models\Skill;
use App\Notifications\AdminAlertNotification;
use App\Services\ApplicationService;
use App\Services\Audit;
use App\Services\JobSearch;
use App\Services\ResumeStorage;
use App\Services\Settings;
use App\Support\Options;
use App\Support\Rules;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Notification;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class SeekerController extends Controller
{
    // ---------------- Dashboard ----------------
    public function dashboard(Request $request, JobSearch $search): JsonResponse
    {
        $user = $request->user();
        $profile = $user->seekerProfile()->with(['locality', 'preferredCategory'])->first();
        $counts = Application::where('user_id', $user->id)->selectRaw('status, COUNT(*) c')->groupBy('status')->pluck('c', 'status');

        // Recommended: jobs matching preferences (category, locality, job type), latest first
        $filters = array_filter([
            'category' => $profile?->preferred_category_id ? (string) $profile->preferred_category_id : null,
            'type' => $profile?->preferred_job_type,
            'sort' => 'latest',
        ]);
        $recommended = $search->query($filters)->whereNotIn('jobs.id', Application::where('user_id', $user->id)->select('job_id'))->limit(6)->get();
        if ($recommended->isEmpty()) {
            $recommended = $search->query(['sort' => 'latest'])->limit(6)->get();
        }

        return response()->json([
            'profile_completion' => $profile?->profile_completion ?? 0,
            'has_resume' => $user->resumes()->exists(),
            'stats' => [
                'applied' => (int) $counts->sum(),
                'shortlisted' => (int) (($counts['shortlisted'] ?? 0) + ($counts['interview_scheduled'] ?? 0) + ($counts['interview_completed'] ?? 0)),
                'selected' => (int) ($counts['selected'] ?? 0),
                'saved' => $user->savedJobs()->count(),
                'unread_notifications' => $user->unreadNotifications()->count(),
            ],
            'recent_applications' => ApplicationResource::collection(
                Application::with('job.locality')->where('user_id', $user->id)->latest()->limit(5)->get()
            )->resolve(),
            'recommended_jobs' => JobCardResource::collection($recommended)->resolve(),
        ]);
    }

    // ---------------- Profile ----------------
    public function profile(Request $request): SeekerProfileResource
    {
        $profile = $request->user()->seekerProfile()->with(['user', 'locality', 'preferredLocality', 'educationLevel', 'preferredCategory', 'preferredRole', 'skills'])->firstOrFail();

        return (new SeekerProfileResource($profile))->withContact();
    }

    public function updateProfile(Request $request): SeekerProfileResource
    {
        $request->merge(['mobile' => Rules::normaliseMobile($request->input('mobile'))]);
        $user = $request->user();
        $data = $request->validate([
            'name' => ['sometimes', 'required', 'string', 'min:2', 'max:120'],
            'mobile' => ['sometimes', 'required', Rules::MOBILE, Rule::unique('users', 'mobile')->ignore($user->id)],
            'headline' => ['nullable', 'string', 'max:150'],
            'locality_id' => ['sometimes', 'nullable', 'integer', 'exists:localities,id'],
            'area' => ['nullable', 'string', 'max:120'],
            'pincode' => ['nullable', Rules::PINCODE],
            'gender' => ['nullable', Rule::in(array_keys(Options::GENDERS))],
            'date_of_birth' => ['nullable', 'date', 'before:-18 years', 'after:-80 years'],
            'education_level_id' => ['nullable', 'integer', 'exists:education_levels,id'],
            'employment_status' => ['nullable', Rule::in(array_keys(Options::EMPLOYMENT_STATUSES))],
            'experience_years' => ['nullable', 'numeric', 'min:0', 'max:50'],
            'preferred_category_id' => ['nullable', 'integer', 'exists:job_categories,id'],
            'preferred_role_id' => ['nullable', 'integer', 'exists:job_roles,id'],
            'expected_salary' => ['nullable', 'numeric', 'min:0', 'max:10000000'],
            'preferred_job_type' => ['nullable', Rule::in(array_keys(Options::EMPLOYMENT_TYPES))],
            'preferred_locality_id' => ['nullable', 'integer', 'exists:localities,id'],
            'preferred_work_mode' => ['nullable', Rule::in(array_keys(Options::WORK_MODES))],
            'availability' => ['nullable', Rule::in(array_keys(Options::AVAILABILITY))],
            'about' => ['nullable', 'string', 'max:2000'],
            'skills' => ['nullable', 'array', 'max:20'],
            'skills.*' => ['string', 'max:60'],
        ]);

        if (isset($data['name']) || isset($data['mobile'])) {
            $user->fill(array_intersect_key($data, array_flip(['name', 'mobile'])));
            if ($user->isDirty('mobile')) {
                $user->mobile_verified_at = null;
            }
            $user->save();
        }
        $profile = $user->seekerProfile;
        $fields = array_diff_key($data, array_flip(['name', 'mobile', 'skills']));
        foreach (['headline' => 150, 'area' => 120, 'about' => 2000] as $k => $max) {
            if (array_key_exists($k, $fields)) {
                $fields[$k] = Rules::clean($fields[$k], $max);
            }
        }
        if (array_key_exists('experience_years', $fields) && $fields['experience_years'] === null) {
            $fields['experience_years'] = 0;
        }
        $profile->fill($fields)->save();
        if (array_key_exists('skills', $data)) {
            $profile->skills()->sync(Skill::resolveNames($data['skills'] ?? [])->pluck('id'));
        }
        $profile->refreshCompletion();

        return $this->profile($request);
    }

    // ---------------- Resumes ----------------
    public function resumes(Request $request): JsonResponse
    {
        return response()->json(['data' => $request->user()->resumes()->latest()->get()->map(fn (Resume $r) => [
            'id' => $r->id, 'name' => $r->original_name, 'size' => $r->size, 'mime' => $r->mime,
            'is_default' => $r->is_default, 'scan_status' => $r->scan_status, 'uploaded_at' => $r->created_at?->toIso8601String(),
        ])]);
    }

    public function uploadResume(Request $request, ResumeStorage $storage, Settings $settings): JsonResponse
    {
        $request->validate(['resume' => ['required', 'file', 'max:'.(int) $settings->get('resume_max_kb'), 'mimes:pdf,docx'], 'replace_id' => ['nullable', 'integer']]);
        $user = $request->user();
        if ($request->filled('replace_id')) {
            $old = $user->resumes()->findOrFail($request->integer('replace_id'));
            $resume = $storage->store($user, $request->file('resume'), $old->is_default);
            $storage->delete($old);
        } else {
            $resume = $storage->store($user, $request->file('resume'));
        }
        $user->seekerProfile?->refreshCompletion();

        return response()->json(['message' => 'Resume uploaded.', 'data' => ['id' => $resume->id, 'name' => $resume->original_name]], 201);
    }

    public function defaultResume(Request $request, int $id): JsonResponse
    {
        $user = $request->user();
        $resume = $user->resumes()->findOrFail($id);
        $user->resumes()->update(['is_default' => false]);
        $resume->update(['is_default' => true]);

        return response()->json(['message' => 'Default resume updated.']);
    }

    public function deleteResume(Request $request, int $id, ResumeStorage $storage): JsonResponse
    {
        $resume = $request->user()->resumes()->findOrFail($id);
        $storage->delete($resume);
        $request->user()->seekerProfile?->refreshCompletion();

        return response()->json(['message' => 'Resume deleted.']);
    }

    public function resumeUrl(Request $request, int $id, ResumeStorage $storage): JsonResponse
    {
        $resume = $request->user()->resumes()->findOrFail($id);

        return response()->json(['url' => $storage->temporaryUrl($resume, $request->user()->id)]);
    }

    // ---------------- Applications ----------------
    public function applications(Request $request): JsonResponse
    {
        $request->validate(['status' => ['nullable', Rule::in(array_keys(Options::APPLICATION_STATUSES))]]);
        $page = Application::with(['job.locality', 'resume'])->where('user_id', $request->user()->id)
            ->when($request->status, fn ($q, $s) => $q->where('status', $s))
            ->latest()->paginate(15);

        return ApplicationResource::collection($page)->response();
    }

    public function application(Request $request, int $id): ApplicationResource
    {
        // IDOR protection: scoped to the signed-in user
        $app = Application::with(['job.locality', 'resume', 'history'])->where('user_id', $request->user()->id)->findOrFail($id);

        return new ApplicationResource($app);
    }

    public function apply(Request $request, int $jobId, ApplicationService $service): JsonResponse
    {
        $data = $request->validate([
            'resume_id' => ['nullable', 'integer'],
            'cover_letter' => ['nullable', 'string', 'max:3000'],
            'answers' => ['nullable', 'array'],
            'answers.*' => ['nullable', 'string', 'max:1000'],
        ]);
        $job = Job::with('questions', 'employer')->findOrFail($jobId);
        $app = $service->apply($job, $request->user(), $data);

        return response()->json([
            'message' => 'Application submitted successfully.',
            'data' => ['id' => $app->id, 'application_no' => $app->application_no, 'applied_at' => $app->created_at->toIso8601String()],
        ], 201);
    }

    public function withdraw(Request $request, int $id, ApplicationService $service): JsonResponse
    {
        $app = Application::where('user_id', $request->user()->id)->findOrFail($id);
        if (in_array($app->status, ['selected', 'rejected', 'withdrawn'], true)) {
            throw ValidationException::withMessages(['status' => 'This application can no longer be withdrawn.']);
        }
        $service->changeStatus($app, 'withdrawn', $request->user(), $request->input('reason'));

        return response()->json(['message' => 'Application withdrawn.']);
    }

    /** Which of the given jobs has the user applied to / saved (for card buttons). */
    public function jobStates(Request $request): JsonResponse
    {
        $ids = array_slice(array_map('intval', (array) $request->input('ids', [])), 0, 100);
        $user = $request->user();

        return response()->json([
            'applied' => Application::where('user_id', $user->id)->whereIn('job_id', $ids)->where('status', '!=', 'withdrawn')->pluck('job_id'),
            'saved' => $user->savedJobs()->whereIn('jobs.id', $ids)->pluck('jobs.id'),
        ]);
    }

    // ---------------- Saved & recently viewed ----------------
    public function saved(Request $request): JsonResponse
    {
        $page = $request->user()->savedJobs()->with(['category', 'role', 'locality', 'educationLevel'])
            ->orderByDesc('saved_jobs.created_at')->paginate(15);

        return JobCardResource::collection($page)->response();
    }

    public function save(Request $request, int $jobId): JsonResponse
    {
        Job::publiclyVisible()->findOrFail($jobId);
        $request->user()->savedJobs()->syncWithoutDetaching([$jobId => ['created_at' => now()]]);

        return response()->json(['message' => 'Job saved.']);
    }

    public function unsave(Request $request, int $jobId): JsonResponse
    {
        $request->user()->savedJobs()->detach($jobId);

        return response()->json(['message' => 'Removed from saved jobs.']);
    }

    public function recentlyViewed(Request $request): JsonResponse
    {
        $ids = JobView::where('user_id', $request->user()->id)->where('created_at', '>', now()->subDays(30))
            ->orderByDesc('id')->limit(50)->pluck('job_id')->unique()->take(10)->values();
        $jobs = Job::publiclyVisible()->with(['category', 'role', 'locality', 'educationLevel'])->whereIn('id', $ids)->get()
            ->sortBy(fn ($j) => $ids->search($j->id))->values();

        return response()->json(['data' => JobCardResource::collection($jobs)->resolve()]);
    }

    // ---------------- Account (DPDP rights) ----------------
    public function deactivate(Request $request): JsonResponse
    {
        $request->validate(['password' => ['required', 'string']]);
        $user = $request->user();
        if (! Hash::check($request->password, $user->password)) {
            throw ValidationException::withMessages(['password' => 'Incorrect password.']);
        }
        $user->update(['status' => 'deactivated']);
        $user->tokens()->delete();
        Audit::log('account.deactivated', $user);

        return response()->json(['message' => 'Your account has been deactivated. Contact support to reactivate it.']);
    }

    public function dataRequest(Request $request): JsonResponse
    {
        $data = $request->validate([
            'type' => ['required', Rule::in(['deletion', 'correction'])],
            'details' => ['nullable', 'required_if:type,correction', 'string', 'max:2000'],
            'password' => ['required_if:type,deletion', 'nullable', 'string'],
        ]);
        $user = $request->user();
        if ($data['type'] === 'deletion') {
            if (! Hash::check((string) $data['password'], $user->password)) {
                throw ValidationException::withMessages(['password' => 'Incorrect password.']);
            }
            if (DataRequest::where('user_id', $user->id)->where('type', 'deletion')->where('status', 'pending')->exists()) {
                return response()->json(['message' => 'A deletion request is already being processed.'], 409);
            }
            $user->update(['deletion_requested_at' => now()]);
        }
        $req = DataRequest::create(['user_id' => $user->id, 'type' => $data['type'], 'details' => Rules::clean($data['details'] ?? null, 2000)]);
        Notification::send(AdminAlertNotification::recipients('data_requests.manage'), new AdminAlertNotification(
            'data_request', 'New account '.$data['type'].' request', "{$user->name} ({$user->user_type}) submitted a {$data['type']} request.", '/admin/data-requests'
        ));

        return response()->json([
            'message' => $data['type'] === 'deletion'
                ? 'Your deletion request has been received. Your account and personal data will be deleted within 30 days, except records we must keep by law.'
                : 'Your correction request has been received. We will update your data and confirm by email.',
            'id' => $req->id,
        ], 201);
    }

    public function myDataRequests(Request $request): JsonResponse
    {
        return response()->json(['data' => DataRequest::where('user_id', $request->user()->id)->latest()->get(['id', 'type', 'status', 'details', 'response', 'created_at', 'processed_at'])]);
    }
}
