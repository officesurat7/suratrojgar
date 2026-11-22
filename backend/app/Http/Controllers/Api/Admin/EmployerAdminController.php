<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Resources\EmployerProfileResource;
use App\Http\Resources\JobManageResource;
use App\Models\AuditLog;
use App\Models\Complaint;
use App\Models\EmployerProfile;
use App\Models\EmployerVerification;
use App\Models\Job;
use App\Models\User;
use App\Notifications\MessageNotification;
use App\Services\Audit;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class EmployerAdminController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $request->validate(['status' => ['nullable', Rule::in(['pending', 'active', 'suspended', 'blocked', 'deactivated'])], 'verified' => ['nullable', 'in:0,1']]);
        $q = EmployerProfile::query()->select('employer_profiles.*')
            ->join('users', 'users.id', '=', 'employer_profiles.user_id')->whereNull('users.deleted_at')->whereNotNull('users.email_verified_at')
            ->with(['user', 'locality', 'businessCategory'])
            ->addSelect(['jobs_count' => Job::selectRaw('COUNT(*)')->whereColumn('jobs.employer_id', 'employer_profiles.user_id')]);

        if ($s = $request->q) {
            $like = '%'.addcslashes($s, '%_\\').'%';
            $q->where(fn ($w) => $w->where('company_name', 'like', $like)->orWhere('users.email', 'like', $like)->orWhere('users.mobile', 'like', $like)->orWhere('contact_person', 'like', $like)->orWhere('gstin', $s));
        }
        $q->when($request->status, fn ($x, $v) => $x->where('users.status', $v))
            ->when($request->filled('verified'), fn ($x) => $request->verified ? $x->whereNotNull('verified_at') : $x->whereNull('verified_at'))
            ->when($request->locality_id, fn ($x, $v) => $x->where('employer_profiles.locality_id', $v))
            ->when($request->business_category_id, fn ($x, $v) => $x->where('business_category_id', $v))
            ->when($request->city, fn ($x, $v) => $x->where('employer_profiles.city', $v));
        $page = $q->orderByDesc('users.created_at')->paginate(25);

        return response()->json([
            'data' => collect($page->items())->map(fn ($p) => (new EmployerProfileResource($p))->private()->resolve() + [
                'user_id' => $p->user_id, 'jobs_count' => (int) $p->jobs_count, 'registered_at' => $p->user?->created_at?->toIso8601String(),
            ]),
            'meta' => ['current_page' => $page->currentPage(), 'last_page' => $page->lastPage(), 'total' => $page->total()],
        ]);
    }

    public function show(int $userId): JsonResponse
    {
        $user = User::where('user_type', 'employer')->with(['employerProfile.locality', 'employerProfile.businessCategory', 'employerProfile.verifications'])->findOrFail($userId);
        $p = $user->employerProfile;
        $jobStats = Job::where('employer_id', $userId)->selectRaw('status, COUNT(*) c')->groupBy('status')->pluck('c', 'status');
        $appStats = DB::table('applications')->whereIn('job_id', Job::withTrashed()->where('employer_id', $userId)->select('id'))->selectRaw('status, COUNT(*) c')->groupBy('status')->pluck('c', 'status');

        return response()->json(['data' => [
            'account' => ['id' => $user->id, 'name' => $user->name, 'email' => $user->email, 'mobile' => $user->mobile, 'status' => $user->status, 'status_reason' => $user->status_reason,
                'registered_at' => $user->created_at?->toIso8601String(), 'last_login_at' => $user->last_login_at?->toIso8601String()],
            'profile' => $p ? (new EmployerProfileResource($p))->private()->resolve() : null,
            'verifications' => $p?->verifications()->latest()->get(),
            'job_stats' => $jobStats, 'application_stats' => $appStats,
            'jobs' => JobManageResource::collection(Job::with(['category', 'locality'])->where('employer_id', $userId)->latest()->limit(50)->get())->resolve(),
            'activity' => AuditLog::where(fn ($w) => $w->where('user_id', $userId)->orWhere(fn ($x) => $x->where('auditable_type', 'User')->where('auditable_id', $userId)))
                ->latest('id')->limit(50)->get(['id', 'action', 'auditable_type', 'auditable_id', 'new_values', 'ip', 'created_at']),
            'logins' => $user->loginHistory()->latest('id')->limit(20)->get(['ip', 'success', 'reason', 'created_at', 'user_agent']),
            'complaints' => Complaint::where('reported_user_id', $userId)->orWhereIn('job_id', Job::withTrashed()->where('employer_id', $userId)->select('id'))->latest()->limit(20)->get(['id', 'ticket_no', 'type', 'reason', 'subject', 'status', 'created_at']),
        ]]);
    }

    public function verify(Request $request, int $userId): JsonResponse
    {
        $data = $request->validate(['decision' => ['required', Rule::in(['approve', 'reject'])], 'notes' => ['nullable', 'string', 'max:1000'], 'display_name' => ['nullable', 'string', 'max:150']]);
        $user = User::where('user_type', 'employer')->findOrFail($userId);
        $p = $user->employerProfile;

        DB::transaction(function () use ($data, $user, $p, $request) {
            EmployerVerification::where('employer_profile_id', $p->id)->where('status', 'pending')->update(['status' => 'closed']);
            EmployerVerification::create(['employer_profile_id' => $p->id, 'status' => $data['decision'] === 'approve' ? 'approved' : 'rejected',
                'notes' => $data['notes'] ?? null, 'reviewed_by' => $request->user()->id, 'reviewed_at' => now()]);
            if ($data['decision'] === 'approve') {
                $p->forceFill(['verified_at' => now(), 'verified_by' => $request->user()->id, 'display_name' => $data['display_name'] ?? $p->display_name])->save();
                if ($user->status === 'pending') {
                    $user->update(['status' => 'active']);
                }
            } else {
                $p->forceFill(['verified_at' => null])->save();
            }
        });
        Audit::log('employer.'.$data['decision'].'d', $user, [], ['notes' => $data['notes'] ?? null]);
        $user->notify(new MessageNotification(
            $data['decision'] === 'approve' ? 'Your employer account is verified' : 'Employer verification unsuccessful',
            $data['decision'] === 'approve' ? 'Congratulations! Your business is verified. You can now post jobs on SuratRojgar.'
                : "We could not verify your business.\n".($data['notes'] ? 'Reason: '.$data['notes']."\n" : '').'Please update your company profile or contact support.',
            '/employer'
        ));

        return response()->json(['message' => $data['decision'] === 'approve' ? 'Employer verified.' : 'Verification rejected.']);
    }

    public function updateStatus(Request $request, int $userId): JsonResponse
    {
        $data = $request->validate(['status' => ['required', Rule::in(['active', 'suspended', 'blocked'])], 'reason' => ['nullable', 'required_unless:status,active', 'string', 'max:255']]);
        $user = User::where('user_type', 'employer')->findOrFail($userId);
        $msg = CandidateController::changeStatus($user, $data['status'], $data['reason'] ?? null);
        if ($data['status'] !== 'active') {
            // Hide all their live jobs immediately
            Job::where('employer_id', $userId)->where('status', 'active')->update(['status' => 'paused']);
            DB::table('featured_jobs')->whereIn('job_id', Job::where('employer_id', $userId)->select('id'))->delete();
            \App\Services\JobSearch::bumpCacheVersion();
        }

        return response()->json(['message' => $msg]);
    }
}
