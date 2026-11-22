<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Support\Facades\Cache;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable, SoftDeletes;

    protected $fillable = [
        'name', 'email', 'mobile', 'user_type', 'status', 'password', 'email_verified_at',
        'notification_preferences', 'created_by', 'status_reason',
    ];

    protected $hidden = ['password', 'two_factor_secret', 'remember_token'];

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'mobile_verified_at' => 'datetime',
            'last_login_at' => 'datetime',
            'deletion_requested_at' => 'datetime',
            'password' => 'hashed',
            'two_factor_secret' => 'encrypted',
            'two_factor_enabled' => 'boolean',
            'notification_preferences' => 'array',
        ];
    }

    // ---------------- Relations ----------------
    public function seekerProfile(): HasOne { return $this->hasOne(JobSeekerProfile::class); }
    public function employerProfile(): HasOne { return $this->hasOne(EmployerProfile::class); }
    public function adminProfile(): HasOne { return $this->hasOne(AdminProfile::class); }
    public function resumes(): HasMany { return $this->hasMany(Resume::class); }
    public function applications(): HasMany { return $this->hasMany(Application::class); }
    public function postedJobs(): HasMany { return $this->hasMany(Job::class, 'employer_id'); }
    public function savedJobs(): BelongsToMany { return $this->belongsToMany(Job::class, 'saved_jobs')->withPivot('created_at'); }
    public function roles(): BelongsToMany { return $this->belongsToMany(Role::class, 'user_roles'); }
    public function directPermissions(): BelongsToMany { return $this->belongsToMany(Permission::class, 'user_permissions')->withPivot('granted_by', 'created_at'); }
    public function loginHistory(): HasMany { return $this->hasMany(LoginHistory::class); }

    // ---------------- Helpers ----------------
    public function isAdminType(): bool { return in_array($this->user_type, ['admin_staff', 'admin', 'super_admin'], true); }
    public function isSuperAdmin(): bool { return $this->user_type === 'super_admin'; }
    public function isEmployer(): bool { return $this->user_type === 'employer'; }
    public function isJobSeeker(): bool { return $this->user_type === 'job_seeker'; }
    public function isActive(): bool { return $this->status === 'active'; }

    /** Permission names (role + direct grants), cached briefly. */
    public function permissionNames(): array
    {
        if ($this->isSuperAdmin()) {
            return Permission::query()->pluck('name')->all();
        }

        return Cache::remember("user:{$this->id}:perms", 300, function () {
            $viaRoles = Permission::query()
                ->join('role_permissions', 'role_permissions.permission_id', '=', 'permissions.id')
                ->join('user_roles', 'user_roles.role_id', '=', 'role_permissions.role_id')
                ->where('user_roles.user_id', $this->id)
                ->pluck('permissions.name');
            $direct = $this->directPermissions()->pluck('permissions.name');

            return $viaRoles->merge($direct)->unique()->values()->all();
        });
    }

    public function hasPermission(string $permission): bool
    {
        if (! $this->isAdminType() || ! $this->isActive()) {
            return false;
        }

        return $this->isSuperAdmin() || in_array($permission, $this->permissionNames(), true);
    }

    public function flushPermissionCache(): void
    {
        Cache::forget("user:{$this->id}:perms");
    }

    public function wantsNotification(string $key, string $channel = 'mail'): bool
    {
        $prefs = $this->notification_preferences ?? [];

        return (bool) ($prefs[$key][$channel] ?? true);
    }
}
