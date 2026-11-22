<?php

namespace App\Http\Controllers\Api\Auth;

use App\Http\Controllers\Controller;
use App\Http\Resources\UserResource;
use App\Models\EmployerProfile;
use App\Models\EmployerVerification;
use App\Models\JobSeekerProfile;
use App\Models\LoginHistory;
use App\Models\Role;
use App\Models\Skill;
use App\Models\User;
use App\Notifications\AccountExistsNotification;
use App\Notifications\AdminAlertNotification;
use App\Notifications\MessageNotification;
use App\Services\Audit;
use App\Services\OtpService;
use App\Services\ResumeStorage;
use App\Services\Settings;
use App\Services\Totp;
use App\Support\Options;
use App\Support\Rules;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    private const GENERIC_SENT = 'If this email address can be used, we have sent a 6-digit verification code to it. Please check your inbox (and spam folder).';
    private const GENERIC_LOGIN_FAIL = 'Invalid email or password.';

    public function __construct(private OtpService $otp, private Settings $settings) {}

    // =====================================================================
    // Registration
    // =====================================================================

    public function registerJobSeeker(Request $request, ResumeStorage $resumes): JsonResponse
    {
        $request->merge(['mobile' => Rules::normaliseMobile($request->input('mobile')), 'email' => Str::lower(trim((string) $request->input('email')))]);
        $data = $request->validate([
            'name' => ['required', 'string', 'min:2', 'max:120'],
            'mobile' => ['required', Rules::MOBILE],
            'email' => ['required', 'email:rfc', 'max:191'],
            'password' => ['required', 'confirmed', Rules::password()],
            'state' => ['nullable', 'string', 'max:60'],
            'city' => ['nullable', 'string', 'max:60'],
            'locality_id' => ['required', 'integer', 'exists:localities,id'],
            'area' => ['nullable', 'string', 'max:120'],
            'pincode' => ['required', Rules::PINCODE],
            'gender' => ['nullable', Rule::in(array_keys(Options::GENDERS))],
            'date_of_birth' => ['nullable', 'date', 'before:-18 years', 'after:-80 years'],
            'education_level_id' => ['required', 'integer', 'exists:education_levels,id'],
            'employment_status' => ['required', Rule::in(array_keys(Options::EMPLOYMENT_STATUSES))],
            'experience_years' => ['required', 'numeric', 'min:0', 'max:50'],
            'preferred_category_id' => ['nullable', 'integer', 'exists:job_categories,id'],
            'preferred_role_id' => ['nullable', 'integer', 'exists:job_roles,id'],
            'expected_salary' => ['nullable', 'numeric', 'min:0', 'max:10000000'],
            'preferred_job_type' => ['nullable', Rule::in(array_keys(Options::EMPLOYMENT_TYPES))],
            'preferred_locality_id' => ['nullable', 'integer', 'exists:localities,id'],
            'preferred_work_mode' => ['nullable', Rule::in(array_keys(Options::WORK_MODES))],
            'skills' => ['nullable', 'array', 'max:20'],
            'skills.*' => ['string', 'max:60'],
            'resume' => ['nullable', 'file', 'max:'.(int) $this->settings->get('resume_max_kb'), 'mimes:pdf,docx'],
            'consent' => ['accepted'],
        ], ['date_of_birth.before' => 'You must be at least 18 years old to register.', 'consent.accepted' => 'Please accept the Terms and Privacy Policy to continue.']);

        $user = $this->prepareUnverifiedUser($data, 'job_seeker');
        if ($user) {
            DB::transaction(function () use ($user, $data, $request, $resumes) {
                $profile = JobSeekerProfile::updateOrCreate(['user_id' => $user->id], [
                    'state' => 'Gujarat', 'city' => 'Surat',
                    'locality_id' => $data['locality_id'], 'area' => Rules::clean($data['area'] ?? null, 120),
                    'pincode' => $data['pincode'], 'gender' => $data['gender'] ?? null,
                    'date_of_birth' => $data['date_of_birth'] ?? null,
                    'education_level_id' => $data['education_level_id'], 'employment_status' => $data['employment_status'],
                    'experience_years' => $data['experience_years'],
                    'preferred_category_id' => $data['preferred_category_id'] ?? null, 'preferred_role_id' => $data['preferred_role_id'] ?? null,
                    'expected_salary' => $data['expected_salary'] ?? null, 'preferred_job_type' => $data['preferred_job_type'] ?? null,
                    'preferred_locality_id' => $data['preferred_locality_id'] ?? null, 'preferred_work_mode' => $data['preferred_work_mode'] ?? null,
                ]);
                $profile->skills()->sync(Skill::resolveNames($data['skills'] ?? [])->pluck('id'));
                if ($request->hasFile('resume')) {
                    $user->resumes()->each(fn ($r) => $resumes->delete($r));   // re-registration replaces an old unverified upload
                    $resumes->store($user, $request->file('resume'));
                }
                $profile->refreshCompletion();
            });
            $this->otp->send($user->email, 'register', $request->ip());
        }

        return response()->json(['message' => self::GENERIC_SENT, 'email' => $data['email']], 202);
    }

    public function registerEmployer(Request $request): JsonResponse
    {
        $request->merge([
            'mobile' => Rules::normaliseMobile($request->input('mobile')),
            'email' => Str::lower(trim((string) $request->input('email'))),
            'gstin' => $request->filled('gstin') ? Str::upper(trim($request->input('gstin'))) : null,
        ]);
        $data = $request->validate([
            'company_name' => ['required', 'string', 'min:2', 'max:150'],
            'contact_person' => ['required', 'string', 'min:2', 'max:120'],
            'mobile' => ['required', Rules::MOBILE],
            'email' => ['required', 'email:rfc', 'max:191'],
            'password' => ['required', 'confirmed', Rules::password()],
            'state' => ['nullable', 'string', 'max:60'],
            'city' => ['nullable', 'string', 'max:60'],
            'locality_id' => ['required', 'integer', 'exists:localities,id'],
            'area' => ['nullable', 'string', 'max:120'],
            'address' => ['required', 'string', 'min:10', 'max:500'],
            'pincode' => ['required', Rules::PINCODE],
            'company_type' => ['required', Rule::in(array_keys(Options::COMPANY_TYPES))],
            'business_category_id' => ['required', 'integer', 'exists:business_categories,id'],
            'website' => ['nullable', 'url:http,https', 'max:255'],
            'gstin' => ['nullable', Rules::GSTIN],
            'consent' => ['accepted'],
        ], ['gstin.regex' => 'Please enter a valid 15-character GSTIN (e.g. 24ABCDE1234F1Z5).', 'consent.accepted' => 'Please accept the Terms and Privacy Policy to continue.']);

        $data['name'] = $data['contact_person'];
        $user = $this->prepareUnverifiedUser($data, 'employer');
        if ($user) {
            DB::transaction(function () use ($user, $data) {
                $profile = EmployerProfile::firstOrNew(['user_id' => $user->id]);
                $profile->fill([
                    'company_name' => Rules::clean($data['company_name'], 150),
                    'contact_person' => Rules::clean($data['contact_person'], 120),
                    'company_type' => $data['company_type'], 'business_category_id' => $data['business_category_id'],
                    'website' => $data['website'] ?? null, 'gstin' => $data['gstin'] ?? null,
                    'state' => 'Gujarat', 'city' => 'Surat', 'locality_id' => $data['locality_id'],
                    'area' => Rules::clean($data['area'] ?? null, 120), 'address' => Rules::clean($data['address'], 500),
                    'pincode' => $data['pincode'],
                ]);
                if (! $profile->exists) {
                    $profile->slug = $this->uniqueSlug($data['company_name']);
                }
                $profile->save();
            });
            $this->otp->send($user->email, 'register', $request->ip());
        }

        return response()->json(['message' => self::GENERIC_SENT, 'email' => $data['email']], 202);
    }

    /**
     * Returns the (new or reused) unverified user to continue registration with, or null when the
     * email/mobile already belongs to a verified account. In that case the owner gets an email and
     * the API response stays identical, so nobody can discover which emails are registered.
     */
    private function prepareUnverifiedUser(array $data, string $type): ?User
    {
        return DB::transaction(function () use ($data, $type) {
            $byEmail = User::withTrashed()->where('email', $data['email'])->lockForUpdate()->first();
            $byMobile = User::withTrashed()->where('mobile', $data['mobile'])->lockForUpdate()->first();

            if ($byEmail && ($byEmail->email_verified_at || $byEmail->trashed() || $byEmail->user_type !== $type)) {
                $byEmail->trashed() ?: $byEmail->notify(new AccountExistsNotification);

                return null;
            }
            if ($byMobile && $byMobile->id !== $byEmail?->id) {
                if ($byMobile->email_verified_at && ! $byMobile->trashed()) {
                    $byMobile->notify(new AccountExistsNotification);

                    return null;
                }
                $byMobile->update(['mobile' => null]);   // release the number from a stale, never-verified signup
            }

            $user = $byEmail ?? new User;
            $user->fill([
                'name' => Rules::clean($data['name'], 120), 'email' => $data['email'], 'mobile' => $data['mobile'],
                'user_type' => $type, 'status' => 'pending', 'password' => $data['password'],
                'notification_preferences' => ['job_alerts' => ['mail' => true], 'application_updates' => ['mail' => true]],
            ])->save();
            if ($role = Role::where('name', $type)->first()) {
                $user->roles()->syncWithoutDetaching([$role->id]);
            }

            return $user;
        });
    }

    private function uniqueSlug(string $name): string
    {
        $base = Str::limit(Str::slug($name), 160, '') ?: 'company';
        $slug = $base;
        $i = 2;
        while (EmployerProfile::where('slug', $slug)->exists()) {
            $slug = $base.'-'.$i++;
        }

        return $slug;
    }

    // =====================================================================
    // Email verification
    // =====================================================================

    public function verifyEmail(Request $request): JsonResponse
    {
        $data = $request->validate(['email' => ['required', 'email'], 'code' => ['required', 'string', 'size:6']]);
        $email = Str::lower($data['email']);
        $user = User::where('email', $email)->whereNull('email_verified_at')->first();

        if (! $user || ! $this->otp->verify($email, 'register', $data['code'])) {
            throw ValidationException::withMessages(['code' => 'The code is invalid or has expired. Please request a new code.']);
        }

        DB::transaction(function () use ($user) {
            $user->email_verified_at = now();
            if ($user->isJobSeeker()) {
                $user->status = 'active';
            } elseif ($user->isEmployer()) {
                $profile = $user->employerProfile;
                if ($this->settings->get('employer_auto_activate')) {
                    $user->status = 'active';
                    $profile?->forceFill(['verified_at' => now()])->save();
                } else {
                    $user->status = 'pending';
                    if ($profile) {
                        EmployerVerification::create(['employer_profile_id' => $profile->id, 'status' => 'pending', 'method' => $profile->gstin ? 'gstin' : 'manual']);
                    }
                }
            }
            $user->save();
        });

        if ($user->isEmployer()) {
            $verified = (bool) $user->employerProfile?->verified_at;
            $user->notify(new MessageNotification(
                'Welcome to SuratRojgar',
                $verified ? 'Your employer account is active. You can post jobs right away.'
                    : "Your email is verified. Our team will verify your business shortly (usually within 1 working day).\nMeanwhile you can complete your company profile and prepare job drafts.",
                '/employer'
            ));
            if (! $verified) {
                Notification::send(AdminAlertNotification::recipients('employers.verify'), new AdminAlertNotification(
                    'employer_registered', 'New employer registration', "{$user->employerProfile?->company_name} registered and is awaiting verification.", '/admin/employers?status=pending'
                ));
            }
        } else {
            $user->notify(new MessageNotification('Welcome to SuratRojgar', "Your account is ready. Complete your profile and upload your resume to get noticed by employers in Surat.", '/seeker/profile'));
        }

        return $this->issueToken($user, $request);
    }

    public function resendOtp(Request $request): JsonResponse
    {
        $data = $request->validate(['email' => ['required', 'email'], 'purpose' => ['required', Rule::in(['register', 'password_reset'])]]);
        $email = Str::lower($data['email']);
        $user = User::where('email', $email)->first();
        $eligible = $data['purpose'] === 'register'
            ? ($user && ! $user->email_verified_at)
            : ($user && $user->email_verified_at && in_array($user->status, ['active', 'pending'], true));

        $retry = (int) $this->settings->get('otp_resend_cooldown_seconds');
        if ($eligible) {
            $res = $this->otp->send($email, $data['purpose'], $request->ip());
            $retry = $res['retry_after'];
        }

        return response()->json(['message' => self::GENERIC_SENT, 'retry_after' => $retry], 202);
    }

    // =====================================================================
    // Login (+ second factor for administrators)
    // =====================================================================

    public function login(Request $request): JsonResponse
    {
        $data = $request->validate([
            'email' => ['required', 'email'],
            'password' => ['required', 'string', 'max:200'],
            // user = job seeker / employer login; staff / admin / super = separate admin logins
            'portal' => ['required', Rule::in(['user', 'staff', 'admin', 'super'])],
        ]);
        $email = Str::lower($data['email']);
        $ipKey = 'login:'.sha1($email.'|'.$request->ip());
        $acctKey = 'login-acct:'.sha1($email);
        $max = (int) $this->settings->get('login_max_attempts');
        $lockSeconds = 60 * (int) $this->settings->get('login_lockout_minutes');

        if (RateLimiter::tooManyAttempts($ipKey, $max) || RateLimiter::tooManyAttempts($acctKey, $max * 3)) {
            $this->recordLogin(null, $email, $request, false, 'locked');
            $wait = max(RateLimiter::availableIn($ipKey), RateLimiter::availableIn($acctKey));

            return response()->json(['message' => 'Too many failed attempts. Please try again in '.ceil($wait / 60).' minute(s) or reset your password.'], 429);
        }

        $user = User::where('email', $email)->first();
        $portalTypes = ['user' => ['job_seeker', 'employer'], 'staff' => ['admin_staff'], 'admin' => ['admin'], 'super' => ['super_admin']][$data['portal']];

        // Constant-ish time: always run a hash check
        $valid = $user ? Hash::check($data['password'], $user->password) : Hash::check($data['password'], Cache::rememberForever('auth:dummy-hash', fn () => Hash::make(Str::random(32))));
        if (! $user || ! $valid || ! in_array($user->user_type, $portalTypes, true)) {
            RateLimiter::hit($ipKey, $lockSeconds);
            RateLimiter::hit($acctKey, $lockSeconds);
            $this->recordLogin($user, $email, $request, false, $user ? 'bad_password_or_portal' : 'unknown_email');

            return response()->json(['message' => self::GENERIC_LOGIN_FAIL], 422);
        }

        if (in_array($user->status, ['suspended', 'blocked'], true)) {
            $this->recordLogin($user, $email, $request, false, $user->status);

            return response()->json(['message' => 'Your account is '.$user->status.'. Please contact support.', 'code' => 'account_'.$user->status], 403);
        }
        if (! $user->email_verified_at) {
            $this->otp->send($user->email, 'register', $request->ip());

            return response()->json(['message' => 'Please verify your email. We have sent a new code.', 'code' => 'email_unverified', 'email' => $user->email], 403);
        }

        RateLimiter::clear($ipKey);

        // Second factor for administrators
        if ($user->isAdminType()) {
            $method = $user->two_factor_enabled ? 'totp'
                : (($user->isSuperAdmin() || $this->settings->get('require_admin_2fa')) ? 'email' : null);
            if ($method) {
                $challenge = Str::random(48);
                Cache::put('2fa:'.hash('sha256', $challenge), ['user_id' => $user->id, 'method' => $method, 'attempts' => 0], now()->addMinutes(10));
                if ($method === 'email') {
                    $this->otp->send($user->email, 'login_2fa', $request->ip());
                }

                return response()->json(['two_factor_required' => true, 'method' => $method, 'challenge' => $challenge]);
            }
        }

        RateLimiter::clear($acctKey);

        return $this->completeLogin($user, $request);
    }

    public function twoFactorVerify(Request $request): JsonResponse
    {
        $data = $request->validate(['challenge' => ['required', 'string', 'size:48'], 'code' => ['required', 'string', 'max:10']]);
        $key = '2fa:'.hash('sha256', $data['challenge']);
        $state = Cache::get($key);
        if (! $state) {
            return response()->json(['message' => 'Your login session expired. Please log in again.'], 422);
        }
        $user = User::find($state['user_id']);
        $ok = $user && ($state['method'] === 'totp'
            ? Totp::verify((string) $user->two_factor_secret, $data['code'])
            : $this->otp->verify($user->email, 'login_2fa', $data['code']));

        if (! $ok) {
            $state['attempts']++;
            if ($state['attempts'] >= 5) {
                Cache::forget($key);
                $this->recordLogin($user, $user?->email, $request, false, '2fa_locked');

                return response()->json(['message' => 'Too many incorrect codes. Please log in again.'], 429);
            }
            Cache::put($key, $state, now()->addMinutes(10));
            $this->recordLogin($user, $user?->email, $request, false, '2fa_failed');
            throw ValidationException::withMessages(['code' => 'Incorrect verification code.']);
        }
        Cache::forget($key);
        RateLimiter::clear('login-acct:'.sha1($user->email));

        return $this->completeLogin($user, $request);
    }

    private function completeLogin(User $user, Request $request): JsonResponse
    {
        $user->forceFill(['last_login_at' => now()])->saveQuietly();
        $this->recordLogin($user, $user->email, $request, true, 'ok');
        if ($user->isAdminType()) {
            Audit::log('auth.admin_login', $user, [], ['portal' => $user->user_type], $user->id);
        }

        return $this->issueToken($user, $request);
    }

    private function issueToken(User $user, Request $request): JsonResponse
    {
        $ttl = (int) config($user->isAdminType() ? 'sanctum.ttl_admin' : 'sanctum.ttl_user');
        $device = Str::limit((string) $request->userAgent(), 100, '') ?: 'device';
        $token = $user->createToken($device, ['*'], now()->addMinutes($ttl));
        $user->load(['employerProfile', 'seekerProfile']);

        return response()->json([
            'token' => $token->plainTextToken,
            'expires_at' => $token->accessToken->expires_at?->toIso8601String(),
            'user' => new UserResource($user),
        ]);
    }

    private function recordLogin(?User $user, ?string $email, Request $request, bool $success, string $reason): void
    {
        LoginHistory::create([
            'user_id' => $user?->id, 'email' => $email, 'ip' => $request->ip(),
            'user_agent' => Str::limit((string) $request->userAgent(), 250, ''), 'success' => $success, 'reason' => $reason,
        ]);
    }

    // =====================================================================
    // Password reset
    // =====================================================================

    public function forgotPassword(Request $request): JsonResponse
    {
        $data = $request->validate(['email' => ['required', 'email']]);
        $email = Str::lower($data['email']);
        $user = User::where('email', $email)->whereNotNull('email_verified_at')->whereIn('status', ['active', 'pending'])->first();
        if ($user) {
            $this->otp->send($email, 'password_reset', $request->ip());
        }

        return response()->json(['message' => 'If an account exists for this email, a password reset code has been sent.'], 202);
    }

    public function resetPassword(Request $request): JsonResponse
    {
        $data = $request->validate([
            'email' => ['required', 'email'], 'code' => ['required', 'string', 'size:6'],
            'password' => ['required', 'confirmed', Rules::password()],
        ]);
        $email = Str::lower($data['email']);
        $user = User::where('email', $email)->whereNotNull('email_verified_at')->first();
        if (! $user || ! $this->otp->verify($email, 'password_reset', $data['code'])) {
            throw ValidationException::withMessages(['code' => 'The code is invalid or has expired.']);
        }
        $user->password = $data['password'];
        $user->save();
        $user->tokens()->delete();   // sign out everywhere
        RateLimiter::clear('login-acct:'.sha1($email));
        $user->notify(new MessageNotification('Your password was changed', 'Your SuratRojgar password was reset and all devices were signed out. If this was not you, contact support immediately.', '/login'));
        Audit::log('auth.password_reset', $user, [], [], $user->id);

        return response()->json(['message' => 'Password updated. Please log in with your new password.']);
    }

    // =====================================================================
    // Session
    // =====================================================================

    public function me(Request $request): UserResource
    {
        return new UserResource($request->user()->load(['employerProfile', 'seekerProfile']));
    }

    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()?->delete();

        return response()->json(['message' => 'Logged out.']);
    }

    public function logoutAll(Request $request): JsonResponse
    {
        $request->user()->tokens()->delete();
        Audit::log('auth.logout_all', $request->user());

        return response()->json(['message' => 'Logged out from all devices.']);
    }

    public function changePassword(Request $request): JsonResponse
    {
        $data = $request->validate([
            'current_password' => ['required', 'string'],
            'password' => ['required', 'confirmed', Rules::password(), 'different:current_password'],
        ]);
        $user = $request->user();
        if (! Hash::check($data['current_password'], $user->password)) {
            throw ValidationException::withMessages(['current_password' => 'Your current password is incorrect.']);
        }
        $user->password = $data['password'];
        $user->save();
        // Keep this session, revoke all others
        $user->tokens()->where('id', '!=', $user->currentAccessToken()?->id)->delete();
        $user->notify(new MessageNotification('Your password was changed', 'Your password was changed and other devices were signed out. If this was not you, reset your password immediately.', null));
        Audit::log('auth.password_changed', $user);

        return response()->json(['message' => 'Password changed. Other devices have been signed out.']);
    }

    public function updateNotificationPreferences(Request $request): JsonResponse
    {
        $data = $request->validate([
            'preferences' => ['required', 'array'],
            'preferences.*.mail' => ['boolean'],
        ]);
        $allowed = ['job_alerts', 'application_updates', 'job_updates', 'admin_alerts'];
        $prefs = $request->user()->notification_preferences ?? [];
        foreach ($data['preferences'] as $key => $v) {
            if (in_array($key, $allowed, true)) {
                $prefs[$key] = ['mail' => (bool) ($v['mail'] ?? true)];
            }
        }
        $request->user()->update(['notification_preferences' => $prefs]);

        return response()->json(['message' => 'Notification preferences saved.', 'preferences' => $prefs]);
    }

    // =====================================================================
    // TOTP two-factor (administrators)
    // =====================================================================

    public function twoFactorSetup(Request $request): JsonResponse
    {
        $user = $request->user();
        $secret = Totp::generateSecret();
        Cache::put('2fa-setup:'.$user->id, $secret, now()->addMinutes(15));

        return response()->json(['secret' => $secret, 'otpauth_uri' => Totp::otpauthUri($secret, $user->email)]);
    }

    public function twoFactorEnable(Request $request): JsonResponse
    {
        $data = $request->validate(['code' => ['required', 'digits:6']]);
        $user = $request->user();
        $secret = Cache::get('2fa-setup:'.$user->id);
        if (! $secret || ! Totp::verify($secret, $data['code'])) {
            throw ValidationException::withMessages(['code' => 'Incorrect code. Make sure your phone time is correct and try again.']);
        }
        $user->forceFill(['two_factor_secret' => $secret, 'two_factor_enabled' => true])->save();
        Cache::forget('2fa-setup:'.$user->id);
        Audit::log('auth.2fa_enabled', $user);

        return response()->json(['message' => 'Two-factor authentication is now enabled.']);
    }

    public function twoFactorDisable(Request $request): JsonResponse
    {
        $data = $request->validate(['password' => ['required', 'string']]);
        $user = $request->user();
        if (! Hash::check($data['password'], $user->password)) {
            throw ValidationException::withMessages(['password' => 'Incorrect password.']);
        }
        $user->forceFill(['two_factor_secret' => null, 'two_factor_enabled' => false])->save();
        Audit::log('auth.2fa_disabled', $user);

        return response()->json(['message' => 'Authenticator app removed. '.($user->isSuperAdmin() ? 'Email codes will be used as your second factor.' : '')]);
    }
}
