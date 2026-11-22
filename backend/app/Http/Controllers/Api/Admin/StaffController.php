<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\AdminProfile;
use App\Models\Permission;
use App\Models\Role;
use App\Models\User;
use App\Notifications\MessageNotification;
use App\Services\Audit;
use App\Services\OtpService;
use App\Support\Rules;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

/**
 * Admin Staff management (Admin & Super Admin) and Admin management (Super Admin only).
 * Admins can grant staff only the permissions they themselves hold, and never Super-Admin-only ones.
 */
class StaffController extends Controller
{
    private function manageableTypes(User $actor): array
    {
        return $actor->isSuperAdmin() ? ['admin_staff', 'admin'] : ['admin_staff'];
    }

    public function permissions(Request $request): JsonResponse
    {
        $actor = $request->user();
        $grantable = $actor->isSuperAdmin() ? array_keys(Permission::ALL) : array_values(array_diff($actor->permissionNames(), Permission::SUPER_ONLY));

        return response()->json(['data' => collect(Permission::ALL)->map(fn ($v, $k) => ['name' => $k, 'label' => $v[0], 'group' => $v[1], 'grantable' => in_array($k, $grantable, true), 'super_only' => in_array($k, Permission::SUPER_ONLY, true)])->values()]);
    }

    public function index(Request $request): JsonResponse
    {
        $types = $this->manageableTypes($request->user());
        $users = User::whereIn('user_type', $request->type && in_array($request->type, $types, true) ? [$request->type] : $types)
            ->with(['adminProfile', 'directPermissions:id,name'])->orderBy('user_type')->orderBy('name')->get();

        return response()->json(['data' => $users->map(fn ($u) => [
            'id' => $u->id, 'name' => $u->name, 'email' => $u->email, 'mobile' => $u->mobile, 'user_type' => $u->user_type, 'status' => $u->status,
            'designation' => $u->adminProfile?->designation, 'department' => $u->adminProfile?->department,
            'two_factor_enabled' => $u->two_factor_enabled, 'last_login_at' => $u->last_login_at?->toIso8601String(),
            'permissions' => $u->user_type === 'admin' ? ['(all Admin permissions)'] : $u->directPermissions->pluck('name'),
        ])]);
    }

    public function store(Request $request, OtpService $otp): JsonResponse
    {
        $actor = $request->user();
        $request->merge(['mobile' => Rules::normaliseMobile($request->input('mobile')), 'email' => Str::lower(trim((string) $request->email))]);
        $data = $request->validate([
            'user_type' => ['required', Rule::in($this->manageableTypes($actor))],
            'name' => ['required', 'string', 'max:120'],
            'email' => ['required', 'email', 'max:191', Rule::unique('users', 'email')],
            'mobile' => ['nullable', Rules::MOBILE, Rule::unique('users', 'mobile')],
            'designation' => ['nullable', 'string', 'max:100'],
            'department' => ['nullable', 'string', 'max:100'],
            'permissions' => ['nullable', 'array'], 'permissions.*' => ['string', Rule::in(array_keys(Permission::ALL))],
        ]);
        $this->assertGrantable($actor, $data['permissions'] ?? []);

        $user = DB::transaction(function () use ($data, $actor) {
            $user = User::create([
                'name' => Rules::clean($data['name'], 120), 'email' => $data['email'], 'mobile' => $data['mobile'] ?? null,
                'user_type' => $data['user_type'], 'status' => 'active', 'password' => Str::password(32),
                'email_verified_at' => now(), 'created_by' => $actor->id,
            ]);
            AdminProfile::create(['user_id' => $user->id, 'designation' => $data['designation'] ?? null, 'department' => $data['department'] ?? null]);
            $user->roles()->sync(Role::where('name', $data['user_type'])->pluck('id'));
            if ($data['user_type'] === 'admin_staff') {
                $this->syncPermissions($user, $data['permissions'] ?? [], $actor);
            }

            return $user;
        });
        // The new account sets its own password using an emailed reset code: no password is ever shared
        $otp->send($user->email, 'password_reset', $request->ip());
        $user->notify(new MessageNotification('Your SuratRojgar '.str_replace('_', ' ', $user->user_type).' account',
            "An account has been created for you by {$actor->name}.\nUse the code in the separate email on the \"Forgot password\" page to set your password, then log in at the ".($user->user_type === 'admin' ? 'Admin' : 'Staff').' login page.', $user->user_type === 'admin' ? '/admin/login' : '/staff/login'));
        Audit::log('staff.created', $user, [], ['user_type' => $user->user_type, 'permissions' => $data['permissions'] ?? []]);

        return response()->json(['message' => 'Account created. A password set-up code has been emailed to '.$user->email.'.', 'id' => $user->id], 201);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $actor = $request->user();
        $user = User::whereIn('user_type', $this->manageableTypes($actor))->findOrFail($id);
        abort_if($user->id === $actor->id, 422, 'You cannot change your own permissions.');
        $data = $request->validate([
            'name' => ['sometimes', 'required', 'string', 'max:120'],
            'designation' => ['nullable', 'string', 'max:100'], 'department' => ['nullable', 'string', 'max:100'],
            'permissions' => ['sometimes', 'array'], 'permissions.*' => ['string', Rule::in(array_keys(Permission::ALL))],
        ]);
        $oldPerms = $user->directPermissions()->pluck('name')->all();
        if (isset($data['name'])) {
            $user->update(['name' => Rules::clean($data['name'], 120)]);
        }
        AdminProfile::updateOrCreate(['user_id' => $user->id], ['designation' => $data['designation'] ?? null, 'department' => $data['department'] ?? null]);
        if (array_key_exists('permissions', $data) && $user->user_type === 'admin_staff') {
            $this->assertGrantable($actor, $data['permissions']);
            $this->syncPermissions($user, $data['permissions'], $actor);
        }
        Audit::log('staff.updated', $user, ['permissions' => $oldPerms], ['permissions' => $data['permissions'] ?? $oldPerms]);

        return response()->json(['message' => 'Account updated.']);
    }

    public function updateStatus(Request $request, int $id): JsonResponse
    {
        $actor = $request->user();
        $user = User::whereIn('user_type', $this->manageableTypes($actor))->findOrFail($id);
        abort_if($user->id === $actor->id, 422, 'You cannot change your own status.');
        $data = $request->validate(['status' => ['required', Rule::in(['active', 'suspended'])], 'reason' => ['nullable', 'string', 'max:255']]);
        $old = $user->status;
        $user->update(['status' => $data['status'], 'status_reason' => $data['reason'] ?? null]);
        if ($data['status'] === 'suspended') {
            $user->tokens()->delete();
        }
        $user->flushPermissionCache();
        Audit::log('staff.status_changed', $user, ['status' => $old], ['status' => $data['status']]);

        return response()->json(['message' => 'Status updated.']);
    }

    /** Reset an authorised account: revoke sessions, remove 2FA, email a password reset code. */
    public function reset(Request $request, int $id, OtpService $otp): JsonResponse
    {
        $actor = $request->user();
        $user = User::whereIn('user_type', $this->manageableTypes($actor))->findOrFail($id);
        $user->tokens()->delete();
        $user->forceFill(['password' => Str::password(32), 'two_factor_secret' => null, 'two_factor_enabled' => false])->save();
        $otp->send($user->email, 'password_reset', $request->ip());
        Audit::log('staff.reset', $user);

        return response()->json(['message' => 'Account reset. A password reset code was emailed to the user.']);
    }

    private function assertGrantable(User $actor, array $perms): void
    {
        if ($actor->isSuperAdmin()) {
            return;
        }
        $bad = array_diff($perms, array_diff($actor->permissionNames(), Permission::SUPER_ONLY));
        if ($bad) {
            throw ValidationException::withMessages(['permissions' => 'You cannot grant: '.implode(', ', $bad)]);
        }
    }

    private function syncPermissions(User $user, array $names, User $actor): void
    {
        $ids = Permission::whereIn('name', $names)->pluck('id');
        $user->directPermissions()->sync($ids->mapWithKeys(fn ($id) => [$id => ['granted_by' => $actor->id, 'created_at' => now()]])->all());
        $user->flushPermissionCache();
    }
}
