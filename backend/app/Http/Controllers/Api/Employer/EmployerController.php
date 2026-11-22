<?php

namespace App\Http\Controllers\Api\Employer;

use App\Http\Controllers\Controller;
use App\Http\Resources\ApplicationResource;
use App\Http\Resources\EmployerProfileResource;
use App\Http\Resources\JobManageResource;
use App\Http\Resources\SeekerProfileResource;
use App\Models\Application;
use App\Models\Job;
use App\Services\ApplicationService;
use App\Services\Audit;
use App\Services\JobEditor;
use App\Services\JobSearch;
use App\Services\JobWorkflow;
use App\Services\ResumeStorage;
use App\Support\Options;
use App\Support\Rules;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class EmployerController extends Controller
{
    // ---------------- Dashboard ----------------
    public function dashboard(Request $request): JsonResponse
    {
        $user = $request->user();
        $jobs = Job::where('employer_id', $user->id)->selectRaw('status, COUNT(*) c')->groupBy('status')->pluck('c', 'status');
        $apps = Application::whereIn('job_id', Job::where('employer_id', $user->id)->select('id'));
        $byStatus = (clone $apps)->selectRaw('status, COUNT(*) c')->groupBy('status')->pluck('c', 'status');

        return response()->json([
            'verified' => (bool) $user->employerProfile?->verified_at,
            'account_status' => $user->status,
            'jobs' => ['total' => (int) $jobs->sum(), 'active' => (int) ($jobs['active'] ?? 0), 'pending' => (int) ($jobs['pending'] ?? 0),
                'draft' => (int) ($jobs['draft'] ?? 0), 'paused' => (int) ($jobs['paused'] ?? 0), 'closed' => (int) ($jobs['closed'] ?? 0), 'expired' => (int) ($jobs['expired'] ?? 0), 'rejected' => (int) ($jobs['rejected'] ?? 0)],
            'applications' => [
                'total' => (int) $byStatus->sum(),
                'new' => (int) ($byStatus['applied'] ?? 0),
                'shortlisted' => (int) ($byStatus['shortlisted'] ?? 0),
                'interviews' => (int) ($byStatus['interview_scheduled'] ?? 0),
                'selected' => (int) ($byStatus['selected'] ?? 0),
                'today' => (clone $apps)->where('created_at', '>=', now()->startOfDay())->count(),
            ],
            'views_total' => (int) Job::where('employer_id', $user->id)->sum('views_count'),
            'recent_applications' => Application::with(['job.locality', 'user.seekerProfile.locality', 'user.seekerProfile.educationLevel'])
                ->whereIn('job_id', Job::where('employer_id', $user->id)->select('id'))->latest()->limit(6)->get()
                ->map(fn ($a) => (new ApplicationResource($a))->as('employer')->resolve())->values(),
            'unread_notifications' => $user->unreadNotifications()->count(),
        ]);
    }

    // ---------------- Company profile ----------------
    public function profile(Request $request): EmployerProfileResource
    {
        return (new EmployerProfileResource($request->user()->employerProfile()->with(['locality', 'businessCategory', 'user'])->firstOrFail()))->private();
    }

    public function updateProfile(Request $request): EmployerProfileResource
    {
        $request->merge(['gstin' => $request->filled('gstin') ? strtoupper(trim($request->gstin)) : null]);
        $data = $request->validate([
            'company_name' => ['sometimes', 'required', 'string', 'min:2', 'max:150'],
            'contact_person' => ['sometimes', 'required', 'string', 'max:120'],
            'company_type' => ['sometimes', 'required', Rule::in(array_keys(Options::COMPANY_TYPES))],
            'business_category_id' => ['sometimes', 'required', 'integer', 'exists:business_categories,id'],
            'website' => ['nullable', 'url:http,https', 'max:255'],
            'gstin' => ['nullable', Rules::GSTIN],
            'locality_id' => ['sometimes', 'required', 'integer', 'exists:localities,id'],
            'area' => ['nullable', 'string', 'max:120'],
            'address' => ['sometimes', 'required', 'string', 'min:10', 'max:500'],
            'pincode' => ['sometimes', 'required', Rules::PINCODE],
            'about' => ['nullable', 'string', 'max:3000'],
            'company_size' => ['nullable', Rule::in(['1-10', '11-50', '51-200', '201-500', '500+'])],
            'logo' => ['nullable', 'image', 'mimes:jpg,jpeg,png,webp', 'max:1024', 'dimensions:max_width=2000,max_height=2000'],
        ]);
        $profile = $request->user()->employerProfile;
        $fields = collect($data)->except('logo')->map(fn ($v, $k) => is_string($v) && in_array($k, ['company_name', 'contact_person', 'area', 'address', 'about'], true) ? Rules::clean($v, 3000) : $v)->all();

        // Changing the legal name of a verified company resets the public display name for re-review
        if (isset($fields['company_name']) && $fields['company_name'] !== $profile->company_name && $profile->verified_at) {
            $profile->display_name = $profile->display_name ?: $profile->company_name;
        }
        $profile->fill($fields);
        if ($request->hasFile('logo')) {
            if ($profile->logo_path) {
                Storage::disk('public')->delete($profile->logo_path);
            }
            $profile->logo_path = $request->file('logo')->store('logos', 'public');
        }
        $profile->save();
        if (isset($fields['contact_person'])) {
            $request->user()->update(['name' => $fields['contact_person']]);
        }
        // keep denormalised display name on jobs in sync
        Job::where('employer_id', $profile->user_id)->update(['company_display_name' => $profile->publicName()]);
        JobSearch::bumpCacheVersion();

        return $this->profile($request);
    }

    // ---------------- Jobs ----------------
    public function jobs(Request $request): JsonResponse
    {
        $request->validate(['status' => ['nullable', Rule::in(Options::JOB_STATUSES)], 'q' => ['nullable', 'string', 'max:100']]);
        $page = Job::with(['category', 'role', 'locality', 'educationLevel', 'skills', 'questions', 'featured', 'employerProfile'])
            ->where('employer_id', $request->user()->id)
            ->when($request->status, fn ($q, $s) => $q->where('status', $s))
            ->when($request->q, fn ($q, $s) => $q->where('title', 'like', '%'.addcslashes($s, '%_\\').'%'))
            ->latest()->paginate(15);

        return JobManageResource::collection($page)->response();
    }

    public function job(Request $request, int $id): JobManageResource
    {
        return new JobManageResource($this->ownJob($request, $id)->load(['category', 'role', 'locality', 'educationLevel', 'skills', 'questions', 'featured']));
    }

    public function storeJob(Request $request, JobEditor $editor, JobWorkflow $workflow): JsonResponse
    {
        $submit = $request->boolean('submit');
        $data = $editor->validate($request, ! $submit);
        $user = $request->user();
        // One transaction: if submission is refused (e.g. account not yet verified) nothing is saved
        $job = DB::transaction(function () use ($editor, $workflow, $data, $user, $submit) {
            $job = $editor->save(null, $data, $user, $user);
            if ($submit) {
                $workflow->submit($job->fresh(['employer.employerProfile.businessCategory', 'employerProfile.businessCategory']), $user);
            }

            return $job->refresh();
        });

        return response()->json(['message' => $this->submitMessage($job), 'data' => (new JobManageResource($job->load(['category', 'role', 'locality', 'educationLevel', 'skills', 'questions'])))->resolve()], 201);
    }

    public function updateJob(Request $request, int $id, JobEditor $editor, JobWorkflow $workflow): JsonResponse
    {
        $job = $this->ownJob($request, $id);
        if (in_array($job->status, ['closed', 'expired'], true)) {
            throw ValidationException::withMessages(['status' => 'Reopen this job before editing it.']);
        }
        $submit = $request->boolean('submit') || in_array($job->status, ['active', 'pending', 'paused'], true);
        $data = $editor->validate($request, ! $submit);
        $wasActive = $job->status === 'active';
        $job = $editor->save($job, $data, $request->user(), $request->user());

        if (in_array($job->status, ['draft', 'rejected'], true) && $request->boolean('submit')) {
            $workflow->submit($job->fresh(['employer.employerProfile', 'employerProfile.businessCategory']), $request->user());
        } elseif ($wasActive && $workflow->needsManualApproval($job->load('employerProfile.businessCategory'))) {
            // Edits to a live job are re-reviewed so an approved post cannot be swapped for spam
            $job->status = 'pending';
            $job->save();
            JobSearch::bumpCacheVersion();
        } else {
            JobSearch::bumpCacheVersion();
        }
        $job->refresh();

        return response()->json(['message' => $this->submitMessage($job), 'data' => (new JobManageResource($job->load(['category', 'role', 'locality', 'educationLevel', 'skills', 'questions'])))->resolve()]);
    }

    public function jobAction(Request $request, int $id, string $action, JobWorkflow $workflow): JsonResponse
    {
        abort_unless(in_array($action, ['pause', 'activate', 'close', 'reopen', 'submit'], true), 404);
        $job = $this->ownJob($request, $id);
        if ($action === 'submit') {
            if (! in_array($job->status, ['draft', 'rejected'], true)) {
                throw ValidationException::withMessages(['status' => 'Only drafts can be submitted.']);
            }
            // a draft must pass full validation before submission
            validator($job->only(['description', 'vacancies', 'pincode', 'contact_name', 'contact_mobile', 'contact_email', 'locality_id']), [
                'description' => ['required', 'min:30'], 'vacancies' => ['required'], 'pincode' => ['required'],
                'locality_id' => ['required'], 'contact_name' => ['required'], 'contact_mobile' => ['required'], 'contact_email' => ['required'],
            ], [], ['locality_id' => 'location'])->validate();
            $workflow->submit($job->load(['employer.employerProfile', 'employerProfile.businessCategory']), $request->user());
        } else {
            $workflow->transition($job, $action, $request->user());
        }

        return response()->json(['message' => $this->submitMessage($job->refresh()), 'status' => $job->status]);
    }

    public function extendJob(Request $request, int $id): JsonResponse
    {
        $data = $request->validate(['expires_at' => ['required', 'date', 'after:today', 'before:+91 days']]);
        $job = $this->ownJob($request, $id);
        $job->update(['expires_at' => $data['expires_at'], 'expiry_reminder_sent_at' => null]);
        JobSearch::bumpCacheVersion();

        return response()->json(['message' => 'Expiry date updated.']);
    }

    public function deleteJob(Request $request, int $id): JsonResponse
    {
        $job = $this->ownJob($request, $id);
        DB::transaction(function () use ($job) {
            $job->featured()->delete();
            $job->status = 'closed';
            $job->save();
            $job->delete();   // soft delete keeps applications history intact
        });
        Audit::log('job.deleted', $job);
        JobSearch::bumpCacheVersion();

        return response()->json(['message' => 'Job deleted.']);
    }

    public function jobPerformance(Request $request, int $id): JsonResponse
    {
        $job = $this->ownJob($request, $id);
        $from = now()->subDays(29)->startOfDay();
        $views = DB::table('job_views')->where('job_id', $job->id)->where('created_at', '>=', $from)
            ->selectRaw('DATE(CONVERT_TZ(created_at, "+00:00", "+05:30")) d, COUNT(*) c')->groupBy('d')->pluck('c', 'd');
        $apps = DB::table('applications')->where('job_id', $job->id)->where('created_at', '>=', $from)
            ->selectRaw('DATE(CONVERT_TZ(created_at, "+00:00", "+05:30")) d, COUNT(*) c')->groupBy('d')->pluck('c', 'd');
        $series = [];
        for ($d = $from->copy()->timezone('Asia/Kolkata'); $d->lte(now('Asia/Kolkata')); $d->addDay()) {
            $k = $d->toDateString();
            $series[] = ['date' => $k, 'views' => (int) ($views[$k] ?? 0), 'applications' => (int) ($apps[$k] ?? 0)];
        }
        $byStatus = Application::where('job_id', $job->id)->selectRaw('status, COUNT(*) c')->groupBy('status')->pluck('c', 'status');

        return response()->json([
            'views_total' => $job->views_count,
            'applications_total' => $job->applications_count,
            'conversion_rate' => $job->views_count ? round($job->applications_count / $job->views_count * 100, 1) : 0,
            'by_status' => $byStatus,
            'series' => $series,
        ]);
    }

    // ---------------- Applications ----------------
    public function applications(Request $request): JsonResponse
    {
        $request->validate(['job_id' => ['nullable', 'integer'], 'status' => ['nullable', Rule::in(array_keys(Options::APPLICATION_STATUSES))], 'q' => ['nullable', 'string', 'max:100']]);
        $user = $request->user();
        $page = Application::with(['job.locality', 'resume', 'user.seekerProfile.locality', 'user.seekerProfile.educationLevel'])
            ->whereIn('job_id', Job::withTrashed()->where('employer_id', $user->id)->select('id'))
            ->when($request->job_id, fn ($q, $j) => $q->where('job_id', $j))
            ->when($request->status, fn ($q, $s) => $q->where('status', $s))
            ->when($request->q, fn ($q, $s) => $q->where(fn ($w) => $w->where('application_no', $s)->orWhereHas('user', fn ($u) => $u->where('name', 'like', '%'.addcslashes($s, '%_\\').'%'))))
            ->latest()->paginate(20);
        $page->getCollection()->transform(fn ($a) => (new ApplicationResource($a))->as('employer'));

        return response()->json([
            'data' => collect($page->items())->map->resolve(),
            'meta' => ['current_page' => $page->currentPage(), 'last_page' => $page->lastPage(), 'total' => $page->total()],
        ]);
    }

    public function application(Request $request, int $id): JsonResponse
    {
        $app = $this->ownApplication($request, $id)->load(['job.locality', 'resume', 'history', 'user.seekerProfile.locality', 'user.seekerProfile.educationLevel', 'user.seekerProfile.skills', 'user.seekerProfile.preferredCategory', 'user.seekerProfile.preferredRole', 'user.seekerProfile.preferredLocality']);
        // Mark as received the first time the employer opens it
        if ($app->status === 'applied') {
            app(ApplicationService::class)->changeStatus($app, 'received', $request->user());
            $app->refresh()->load('history');
        }
        $profile = $app->user?->seekerProfile;

        return response()->json(['data' => (new ApplicationResource($app))->as('employer')->resolve() + [
            'candidate_profile' => $profile ? (new SeekerProfileResource($profile))->withContact()->resolve() : null,
        ]]);
    }

    public function updateApplication(Request $request, int $id, ApplicationService $service): JsonResponse
    {
        $data = $request->validate([
            'status' => ['required', Rule::in(array_diff(array_keys(Options::APPLICATION_STATUSES), ['withdrawn', 'applied']))],
            'note' => ['nullable', 'string', 'max:500'],
            'interview_at' => ['nullable', 'required_if:status,interview_scheduled', 'date', 'after:now'],
            'interview_details' => ['nullable', 'string', 'max:500'],
        ]);
        $app = $this->ownApplication($request, $id);
        $extra = array_filter(['interview_at' => $data['interview_at'] ?? null, 'interview_details' => isset($data['interview_details']) ? Rules::clean($data['interview_details'], 500) : null]);
        $service->changeStatus($app, $data['status'], $request->user(), Rules::clean($data['note'] ?? null, 500), $extra);

        return response()->json(['message' => 'Application status updated to '.Options::APPLICATION_STATUSES[$data['status']].'.']);
    }

    public function bulkUpdateApplications(Request $request, ApplicationService $service): JsonResponse
    {
        $data = $request->validate([
            'ids' => ['required', 'array', 'max:100'], 'ids.*' => ['integer'],
            'status' => ['required', Rule::in(['under_review', 'shortlisted', 'rejected', 'on_hold'])],
        ]);
        $apps = Application::whereIn('id', $data['ids'])->whereIn('job_id', Job::withTrashed()->where('employer_id', $request->user()->id)->select('id'))->where('status', '!=', 'withdrawn')->get();
        foreach ($apps as $app) {
            $service->changeStatus($app, $data['status'], $request->user());
        }

        return response()->json(['message' => $apps->count().' application(s) updated.']);
    }

    public function saveNotes(Request $request, int $id): JsonResponse
    {
        $data = $request->validate(['employer_notes' => ['nullable', 'string', 'max:3000']]);
        $this->ownApplication($request, $id)->update(['employer_notes' => Rules::clean($data['employer_notes'] ?? null, 3000)]);

        return response()->json(['message' => 'Notes saved.']);
    }

    public function applicationResume(Request $request, int $id, ResumeStorage $storage): JsonResponse
    {
        $app = $this->ownApplication($request, $id);
        $resume = $app->resume;
        if (! $resume) {
            return response()->json(['message' => 'The candidate did not attach a resume.'], 404);
        }

        return response()->json(['url' => $storage->temporaryUrl($resume, $request->user()->id)]);
    }

    public function exportApplications(Request $request)
    {
        $user = $request->user();
        $jobId = $request->integer('job_id');
        $query = Application::with(['job', 'user.seekerProfile.locality', 'user.seekerProfile.educationLevel'])
            ->whereIn('job_id', Job::withTrashed()->where('employer_id', $user->id)->select('id'))
            ->when($jobId, fn ($q) => $q->where('job_id', $jobId))->orderBy('id');
        Audit::log('employer.applications_exported', null, [], ['job_id' => $jobId]);

        return response()->streamDownload(function () use ($query) {
            $out = fopen('php://output', 'w');
            fputcsv($out, ['Application ID', 'Job', 'Candidate', 'Email', 'Mobile', 'Locality', 'Education', 'Experience (yrs)', 'Status', 'Applied on']);
            $query->chunk(500, function ($rows) use ($out) {
                foreach ($rows as $a) {
                    $p = $a->user?->seekerProfile;
                    fputcsv($out, array_map([self::class, 'csvSafe'], [$a->application_no, $a->job?->title, $a->user?->name, $a->user?->email, $a->user?->mobile, $p?->locality?->name, $p?->educationLevel?->name, $p?->experience_years, Options::APPLICATION_STATUSES[$a->status] ?? $a->status, $a->created_at?->timezone('Asia/Kolkata')->format('d-m-Y H:i')]));
                }
            });
            fclose($out);
        }, 'applications-'.now()->format('Ymd-His').'.csv', ['Content-Type' => 'text/csv']);
    }

    /** Prevent CSV/formula injection when opened in Excel. */
    public static function csvSafe(mixed $v): string
    {
        $v = (string) $v;

        return preg_match('/^[=+\-@\t\r]/', $v) ? "'".$v : $v;
    }

    // ---------------- helpers (IDOR protection) ----------------
    private function ownJob(Request $request, int $id): Job
    {
        return Job::where('employer_id', $request->user()->id)->findOrFail($id);
    }

    private function ownApplication(Request $request, int $id): Application
    {
        return Application::whereIn('job_id', Job::withTrashed()->where('employer_id', $request->user()->id)->select('id'))->findOrFail($id);
    }

    private function submitMessage(Job $job): string
    {
        return match ($job->status) {
            'draft' => 'Saved as draft.',
            'pending' => 'Submitted for approval. You will be notified once it is reviewed.',
            'active' => 'Your job is live.',
            'paused' => 'Job paused. It is hidden from job seekers.',
            'closed' => 'Job closed.',
            default => 'Job updated.',
        };
    }
}
