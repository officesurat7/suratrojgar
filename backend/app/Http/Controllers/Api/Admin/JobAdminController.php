<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Resources\ApplicationResource;
use App\Http\Resources\JobManageResource;
use App\Models\Application;
use App\Models\FeaturedJob;
use App\Models\Job;
use App\Models\User;
use App\Services\ApplicationService;
use App\Services\Audit;
use App\Services\FeaturedJobs;
use App\Services\JobEditor;
use App\Services\JobSearch;
use App\Services\JobWorkflow;
use App\Support\Options;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class JobAdminController extends Controller
{
    private const WITH = ['category', 'role', 'locality', 'educationLevel', 'skills', 'questions', 'featured', 'employer', 'employerProfile'];

    public function index(Request $request): JsonResponse
    {
        $request->validate(['status' => ['nullable', Rule::in(array_merge(Options::JOB_STATUSES, ['deleted']))], 'q' => ['nullable', 'string', 'max:100'],
            'sort' => ['nullable', Rule::in(['latest', 'oldest', 'applications', 'views', 'expiry'])]]);
        $q = Job::with(self::WITH);
        if ($request->status === 'deleted') {
            $q->onlyTrashed();
        } elseif ($request->status) {
            $q->where('status', $request->status);
        }
        if ($s = $request->q) {
            $q->where(fn ($w) => ctype_digit($s) ? $w->whereKey((int) $s) : $w->where('title', 'like', '%'.addcslashes($s, '%_\\').'%')->orWhere('company_display_name', 'like', '%'.addcslashes($s, '%_\\').'%'));
        }
        $q->when($request->employer_id, fn ($x, $v) => $x->where('employer_id', $v))
            ->when($request->category_id, fn ($x, $v) => $x->where('job_category_id', $v))
            ->when($request->locality_id, fn ($x, $v) => $x->where('locality_id', $v))
            ->when($request->boolean('featured'), fn ($x) => $x->whereHas('featured'));
        match ($request->input('sort', 'latest')) {
            'oldest' => $q->oldest(),
            'applications' => $q->orderByDesc('applications_count'),
            'views' => $q->orderByDesc('views_count'),
            'expiry' => $q->orderByRaw('expires_at IS NULL')->orderBy('expires_at'),
            default => $q->latest(),
        };

        return JobManageResource::collection($q->paginate(25))->response();
    }

    public function show(int $id): JobManageResource
    {
        return new JobManageResource(Job::withTrashed()->with(self::WITH)->findOrFail($id));
    }

    /** Admin creates a job directly on behalf of an employer (published immediately). */
    public function store(Request $request, JobEditor $editor, JobWorkflow $workflow): JsonResponse
    {
        $request->validate(['employer_id' => ['required', 'integer', Rule::exists('users', 'id')->where('user_type', 'employer')]]);
        $data = $editor->validate($request, false);
        $employer = User::with('employerProfile')->findOrFail($request->employer_id);
        $job = $editor->save(null, $data, $employer, $request->user());
        if (! empty($data['expires_at'])) {
            $job->expires_at = $data['expires_at'];
        }
        $workflow->approve($job, $request->user());

        return response()->json(['message' => 'Job created and published.', 'data' => (new JobManageResource($job->fresh(self::WITH)))->resolve()], 201);
    }

    public function update(Request $request, int $id, JobEditor $editor): JsonResponse
    {
        $job = Job::findOrFail($id);
        $data = $editor->validate($request, $job->status === 'draft');
        $data['confirm_duplicate'] = true;   // admins may knowingly keep similar posts
        $job = $editor->save($job, $data, $job->employer()->with('employerProfile')->first(), $request->user());
        JobSearch::bumpCacheVersion();

        return response()->json(['message' => 'Job updated.', 'data' => (new JobManageResource($job->fresh(self::WITH)))->resolve()]);
    }

    public function approve(Request $request, int $id, JobWorkflow $workflow): JsonResponse
    {
        $workflow->approve(Job::with('employer')->findOrFail($id), $request->user());

        return response()->json(['message' => 'Job approved and published.']);
    }

    public function reject(Request $request, int $id, JobWorkflow $workflow): JsonResponse
    {
        $data = $request->validate(['reason' => ['required', 'string', 'min:5', 'max:500']]);
        $workflow->reject(Job::with('employer')->findOrFail($id), $request->user(), $data['reason']);

        return response()->json(['message' => 'Job rejected. The employer has been notified.']);
    }

    public function action(Request $request, int $id, string $action, JobWorkflow $workflow): JsonResponse
    {
        abort_unless(in_array($action, ['pause', 'activate', 'close', 'reopen', 'expire'], true), 404);
        $job = $workflow->transition(Job::findOrFail($id), $action, $request->user());

        return response()->json(['message' => 'Job status is now '.$job->status.'.', 'status' => $job->status]);
    }

    public function setExpiry(Request $request, int $id): JsonResponse
    {
        $data = $request->validate(['expires_at' => ['required', 'date', 'after:now']]);
        $job = Job::findOrFail($id);
        $old = $job->expires_at;
        $job->update(['expires_at' => $data['expires_at'], 'expiry_reminder_sent_at' => null]);
        Audit::log('job.expiry_changed', $job, ['expires_at' => $old], ['expires_at' => $job->expires_at]);
        JobSearch::bumpCacheVersion();

        return response()->json(['message' => 'Expiry date updated.']);
    }

    public function destroy(Request $request, int $id, FeaturedJobs $featured): JsonResponse
    {
        $job = Job::findOrFail($id);
        $featured->remove($job->id, $request->user()->id, 'job_deleted');
        $job->delete();
        Audit::log('job.deleted', $job);
        JobSearch::bumpCacheVersion();

        return response()->json(['message' => 'Job deleted.']);
    }

    public function restore(int $id): JsonResponse
    {
        $job = Job::onlyTrashed()->findOrFail($id);
        $job->restore();
        $job->update(['status' => 'closed']);
        Audit::log('job.restored', $job);

        return response()->json(['message' => 'Job restored as closed. Reopen it to publish again.']);
    }

    /** Change which employer a job belongs to (authorised admins only). */
    public function changeEmployer(Request $request, int $id): JsonResponse
    {
        $data = $request->validate(['employer_id' => ['required', 'integer', Rule::exists('users', 'id')->where('user_type', 'employer')]]);
        $job = Job::findOrFail($id);
        $old = $job->employer_id;
        $employer = User::with('employerProfile')->findOrFail($data['employer_id']);
        $job->employer_id = $employer->id;
        $job->company_display_name = $employer->employerProfile?->publicName() ?? $employer->name;
        $job->save();
        Audit::log('job.employer_changed', $job, ['employer_id' => $old], ['employer_id' => $employer->id]);
        JobSearch::bumpCacheVersion();

        return response()->json(['message' => 'Employer updated.']);
    }

    public function applications(Request $request): JsonResponse
    {
        $request->validate(['status' => ['nullable', Rule::in(array_keys(Options::APPLICATION_STATUSES))]]);
        $page = Application::with(['job.locality', 'resume', 'user.seekerProfile.locality', 'user.seekerProfile.educationLevel'])
            ->when($request->job_id, fn ($q, $v) => $q->where('job_id', $v))
            ->when($request->user_id, fn ($q, $v) => $q->where('user_id', $v))
            ->when($request->status, fn ($q, $v) => $q->where('status', $v))
            ->when($request->q, fn ($q, $s) => $q->where(fn ($w) => $w->where('application_no', $s)->orWhereHas('user', fn ($u) => $u->where('name', 'like', '%'.addcslashes($s, '%_\\').'%'))))
            ->latest()->paginate(25);

        return response()->json([
            'data' => collect($page->items())->map(fn ($a) => (new ApplicationResource($a))->as('admin')->resolve()),
            'meta' => ['current_page' => $page->currentPage(), 'last_page' => $page->lastPage(), 'total' => $page->total()],
        ]);
    }

    public function application(int $id): JsonResponse
    {
        $a = Application::with(['job.locality', 'resume', 'history.changer:id,name,user_type', 'user.seekerProfile.locality', 'user.seekerProfile.educationLevel'])->findOrFail($id);

        return response()->json(['data' => (new ApplicationResource($a))->as('admin')->resolve()]);
    }

    public function updateApplication(Request $request, int $id, ApplicationService $service): JsonResponse
    {
        $data = $request->validate([
            'status' => ['required', Rule::in(array_diff(array_keys(Options::APPLICATION_STATUSES), ['withdrawn']))],
            'note' => ['nullable', 'string', 'max:500'],
            'interview_at' => ['nullable', 'required_if:status,interview_scheduled', 'date'],
            'interview_details' => ['nullable', 'string', 'max:500'],
        ]);
        $app = Application::findOrFail($id);
        $service->changeStatus($app, $data['status'], $request->user(), $data['note'] ?? null, array_filter(['interview_at' => $data['interview_at'] ?? null, 'interview_details' => $data['interview_details'] ?? null]));
        Audit::log('application.status_by_admin', $app, [], ['status' => $data['status']]);

        return response()->json(['message' => 'Application updated.']);
    }

    /** Allow a candidate to re-apply to a job (admin override of duplicate prevention). */
    public function allowReapply(Request $request, int $id): JsonResponse
    {
        $job = Job::findOrFail($id);
        $job->update(['allow_reapply' => $request->boolean('allow', true)]);
        Audit::log('job.allow_reapply', $job, [], ['allow' => $job->allow_reapply]);

        return response()->json(['message' => 'Re-application setting updated.']);
    }
}
