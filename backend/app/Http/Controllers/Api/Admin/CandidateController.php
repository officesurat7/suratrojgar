<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Api\Employer\EmployerController;
use App\Http\Controllers\Controller;
use App\Http\Resources\ApplicationResource;
use App\Http\Resources\SeekerProfileResource;
use App\Models\Application;
use App\Models\JobSeekerProfile;
use App\Models\User;
use App\Notifications\MessageNotification;
use App\Services\Audit;
use App\Services\ResumeStorage;
use App\Support\Options;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

/** Locality-wise candidate database & job seeker management. Personal data access is permission-gated and audited. */
class CandidateController extends Controller
{
    private function filtered(Request $request): Builder
    {
        $request->validate([
            'q' => ['nullable', 'string', 'max:100'], 'status' => ['nullable', Rule::in(Options::USER_STATUSES)],
            'sort' => ['nullable', Rule::in(['latest', 'oldest', 'name', 'experience', 'salary', 'completion'])],
        ]);
        $q = JobSeekerProfile::query()->select('job_seeker_profiles.*')
            ->join('users', 'users.id', '=', 'job_seeker_profiles.user_id')->whereNull('users.deleted_at')
            ->with(['user', 'locality', 'preferredLocality', 'educationLevel', 'preferredCategory', 'preferredRole', 'skills']);

        if ($s = $request->q) {
            $like = '%'.addcslashes($s, '%_\\').'%';
            $q->where(fn ($w) => $w->where('users.name', 'like', $like)->orWhere('users.email', 'like', $like)->orWhere('users.mobile', 'like', $like));
        }
        $q->when($request->status, fn ($x, $v) => $x->where('users.status', $v));
        foreach (['locality_id', 'preferred_locality_id', 'education_level_id', 'preferred_category_id', 'preferred_role_id', 'preferred_job_type', 'preferred_work_mode', 'availability', 'employment_status', 'pincode'] as $col) {
            if ($request->filled($col)) {
                $q->whereIn("job_seeker_profiles.$col", (array) $request->input($col));
            }
        }
        if ($request->filled('area')) {
            $q->where('job_seeker_profiles.area', 'like', '%'.addcslashes($request->area, '%_\\').'%');
        }
        if ($request->filled('experience_min')) {
            $q->where('experience_years', '>=', (float) $request->experience_min);
        }
        if ($request->filled('experience_max')) {
            $q->where('experience_years', '<=', (float) $request->experience_max);
        }
        if ($request->filled('salary_min')) {
            $q->where('expected_salary', '>=', (float) $request->salary_min);
        }
        if ($request->filled('salary_max')) {
            $q->where('expected_salary', '<=', (float) $request->salary_max);
        }
        if ($request->filled('skill')) {
            $q->whereHas('skills', fn ($s) => $s->where('name', 'like', '%'.addcslashes($request->skill, '%_\\').'%'));
        }
        if ($request->boolean('has_resume')) {
            $q->whereExists(fn ($e) => $e->selectRaw(1)->from('resumes')->whereColumn('resumes.user_id', 'users.id')->whereNull('resumes.deleted_at'));
        }

        match ($request->input('sort', 'latest')) {
            'oldest' => $q->orderBy('users.created_at'),
            'name' => $q->orderBy('users.name'),
            'experience' => $q->orderByDesc('experience_years'),
            'salary' => $q->orderByDesc('expected_salary'),
            'completion' => $q->orderByDesc('profile_completion'),
            default => $q->orderByDesc('users.created_at'),
        };

        return $q;
    }

    public function index(Request $request): JsonResponse
    {
        $page = $this->filtered($request)->paginate(min((int) $request->input('per_page', 25), 100));
        $canSeeContact = $request->user()->hasPermission('job_seekers.view');

        return response()->json([
            'data' => collect($page->items())->map(fn ($p) => (new SeekerProfileResource($p))->withContact($canSeeContact)->resolve() + [
                'status' => $p->user?->status, 'registered_at' => $p->user?->created_at?->toIso8601String(),
                'deletion_requested' => (bool) $p->user?->deletion_requested_at,
            ]),
            'meta' => ['current_page' => $page->currentPage(), 'last_page' => $page->lastPage(), 'total' => $page->total(), 'per_page' => $page->perPage()],
        ]);
    }

    public function show(Request $request, int $id): JsonResponse
    {
        $user = User::where('user_type', 'job_seeker')->with('seekerProfile.locality', 'seekerProfile.preferredLocality', 'seekerProfile.educationLevel', 'seekerProfile.preferredCategory', 'seekerProfile.preferredRole', 'seekerProfile.skills')->findOrFail($id);
        Audit::log('candidate.viewed', $user);
        $apps = Application::with(['job.locality', 'resume'])->where('user_id', $id)->latest()->limit(50)->get();

        return response()->json([
            'data' => [
                'account' => ['id' => $user->id, 'name' => $user->name, 'email' => $user->email, 'mobile' => $user->mobile, 'status' => $user->status, 'status_reason' => $user->status_reason,
                    'email_verified' => (bool) $user->email_verified_at, 'registered_at' => $user->created_at?->toIso8601String(), 'last_login_at' => $user->last_login_at?->toIso8601String(),
                    'deletion_requested_at' => $user->deletion_requested_at?->toIso8601String()],
                'profile' => $user->seekerProfile ? (new SeekerProfileResource($user->seekerProfile))->withContact()->resolve() : null,
                'resumes' => $request->user()->hasPermission('resumes.view') ? $user->resumes()->latest()->get(['id', 'original_name', 'size', 'is_default', 'scan_status', 'created_at']) : [],
                'applications' => ApplicationResource::collection($apps)->resolve(),
            ],
        ]);
    }

    public function resumeUrl(Request $request, int $id, int $resumeId, ResumeStorage $storage): JsonResponse
    {
        $resume = User::where('user_type', 'job_seeker')->findOrFail($id)->resumes()->findOrFail($resumeId);

        return response()->json(['url' => $storage->temporaryUrl($resume, $request->user()->id)]);
    }

    public function updateStatus(Request $request, int $id): JsonResponse
    {
        $data = $request->validate(['status' => ['required', Rule::in(['active', 'suspended', 'blocked'])], 'reason' => ['nullable', 'required_unless:status,active', 'string', 'max:255']]);

        return response()->json(['message' => self::changeStatus(User::where('user_type', 'job_seeker')->findOrFail($id), $data['status'], $data['reason'] ?? null)]);
    }

    /** Shared by candidate & employer management. */
    public static function changeStatus(User $user, string $status, ?string $reason): string
    {
        $old = $user->status;
        $user->update(['status' => $status, 'status_reason' => $reason]);
        if (in_array($status, ['suspended', 'blocked'], true)) {
            $user->tokens()->delete();   // force sign-out
        }
        Audit::log('user.status_changed', $user, ['status' => $old], ['status' => $status, 'reason' => $reason]);
        $user->notify(new MessageNotification(
            $status === 'active' ? 'Your account is active' : 'Your account has been '.$status,
            $status === 'active' ? 'Your SuratRojgar account has been (re)activated. You can log in now.' : "Your SuratRojgar account has been {$status}.".($reason ? "\nReason: {$reason}" : '')."\nIf you think this is a mistake, please contact support.",
            $status === 'active' ? '/login' : '/contact-us'
        ));

        return 'Account status changed to '.$status.'.';
    }

    public function export(Request $request)
    {
        $query = $this->filtered($request);
        Audit::log('candidates.exported', null, [], ['filters' => $request->except(['page'])]);

        return response()->streamDownload(function () use ($query) {
            $out = fopen('php://output', 'w');
            fputcsv($out, ['Name', 'Email', 'Mobile', 'Locality', 'Area', 'PIN', 'Education', 'Experience (yrs)', 'Preferred category', 'Preferred role', 'Job type', 'Work mode', 'Expected salary (monthly)', 'Availability', 'Skills', 'Status', 'Registered']);
            $query->chunk(500, function ($rows) use ($out) {
                foreach ($rows as $p) {
                    fputcsv($out, array_map([EmployerController::class, 'csvSafe'], [
                        $p->user?->name, $p->user?->email, $p->user?->mobile, $p->locality?->name, $p->area, $p->pincode, $p->educationLevel?->name,
                        $p->experience_years, $p->preferredCategory?->name, $p->preferredRole?->name,
                        Options::EMPLOYMENT_TYPES[$p->preferred_job_type] ?? $p->preferred_job_type, Options::WORK_MODES[$p->preferred_work_mode] ?? $p->preferred_work_mode,
                        $p->expected_salary, Options::AVAILABILITY[$p->availability] ?? $p->availability, $p->skills->pluck('name')->implode('; '),
                        $p->user?->status, $p->user?->created_at?->timezone('Asia/Kolkata')->format('d-m-Y'),
                    ]));
                }
            });
            fclose($out);
        }, 'candidates-'.now()->format('Ymd-His').'.csv', ['Content-Type' => 'text/csv']);
    }
}
