<?php

namespace Tests\Feature;

use App\Models\EducationLevel;
use App\Models\Locality;
use App\Models\User;
use App\Notifications\OtpCodeNotification;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;

class AuthTest extends TestCase
{
    private function lastCode(string $email): string
    {
        $code = null;
        Notification::assertSentOnDemand(OtpCodeNotification::class, function ($n, $channels, $notifiable) use ($email, &$code) {
            if (($notifiable->routes['mail'] ?? null) === $email) {
                $code = (fn () => $this->code)->call($n);
            }

            return true;
        });

        return (string) $code;
    }

    private function registerPayload(string $email): array
    {
        return [
            'name' => 'Test Seeker', 'mobile' => '98'.random_int(10000000, 99999999), 'email' => $email,
            'password' => 'Strong#Pass2026', 'password_confirmation' => 'Strong#Pass2026',
            'locality_id' => Locality::first()->id, 'pincode' => '395007', 'education_level_id' => EducationLevel::first()->id,
            'employment_status' => 'unemployed', 'experience_years' => 0, 'consent' => true,
        ];
    }

    public function test_registration_requires_email_otp_before_login(): void
    {
        Notification::fake();
        $email = 'new.seeker@example.com';
        $this->postJson('/api/v1/auth/register/job-seeker', $this->registerPayload($email))->assertSuccessful();

        $user = User::where('email', $email)->first();
        $this->assertNotNull($user);
        $this->assertNull($user->email_verified_at);
        $this->assertNotSame('Strong#Pass2026', $user->password);
        $this->assertTrue(Hash::check('Strong#Pass2026', $user->password));

        // Cannot log in before verifying
        $this->postJson('/api/v1/auth/login', ['email' => $email, 'password' => 'Strong#Pass2026', 'portal' => 'user'])
            ->assertForbidden()->assertJsonPath('code', 'email_unverified');

        // Wrong code fails, right code verifies and signs in
        $this->postJson('/api/v1/auth/verify-email', ['email' => $email, 'code' => '000000'])->assertUnprocessable();
        $this->postJson('/api/v1/auth/verify-email', ['email' => $email, 'code' => $this->lastCode($email)])->assertOk()->assertJsonStructure(['token']);
        $this->assertNotNull($user->fresh()->email_verified_at);
    }

    public function test_otp_is_burned_after_too_many_wrong_attempts(): void
    {
        Notification::fake();
        $email = 'brute.force@example.com';
        $this->postJson('/api/v1/auth/register/job-seeker', $this->registerPayload($email))->assertSuccessful();
        $good = $this->lastCode($email);
        for ($i = 0; $i < 5; $i++) {
            $this->postJson('/api/v1/auth/verify-email', ['email' => $email, 'code' => $good === '111111' ? '222222' : '111111']);
        }
        // Even the correct code no longer works
        $this->postJson('/api/v1/auth/verify-email', ['email' => $email, 'code' => $good])->assertUnprocessable();
    }

    public function test_weak_password_and_missing_consent_are_rejected(): void
    {
        $p = $this->registerPayload('weak@example.com');
        $p['password'] = $p['password_confirmation'] = 'password';
        unset($p['consent']);
        $this->postJson('/api/v1/auth/register/job-seeker', $p)->assertUnprocessable()->assertJsonValidationErrors(['password', 'consent']);
    }

    public function test_login_lockout_after_repeated_failures(): void
    {
        $email = $this->seeker()->email;
        for ($i = 0; $i < 5; $i++) {
            $this->postJson('/api/v1/auth/login', ['email' => $email, 'password' => 'wrong-'.$i, 'portal' => 'user'])->assertUnprocessable();
        }
        // Locked even with the right password
        $this->postJson('/api/v1/auth/login', ['email' => $email, 'password' => 'Demo@12345', 'portal' => 'user'])->assertStatus(429);
    }

    public function test_unknown_email_and_wrong_password_give_the_same_message(): void
    {
        $a = $this->postJson('/api/v1/auth/login', ['email' => 'nobody@example.com', 'password' => 'x', 'portal' => 'user'])->json('message');
        $b = $this->postJson('/api/v1/auth/login', ['email' => $this->employer()->email, 'password' => 'x', 'portal' => 'user'])->json('message');
        $this->assertSame($a, $b);
    }

    public function test_portals_are_separate(): void
    {
        // A job seeker cannot sign in through the admin portal, and an admin cannot use the user portal
        $this->postJson('/api/v1/auth/login', ['email' => $this->seeker()->email, 'password' => 'Demo@12345', 'portal' => 'admin'])->assertUnprocessable();
        $admin = $this->makeAdmin('admin');
        $this->postJson('/api/v1/auth/login', ['email' => $admin->email, 'password' => 'Secret#Pass123', 'portal' => 'user'])->assertUnprocessable();
        $this->postJson('/api/v1/auth/login', ['email' => $admin->email, 'password' => 'Secret#Pass123', 'portal' => 'admin'])->assertOk()->assertJsonStructure(['token']);
    }

    public function test_super_admin_always_needs_a_second_factor(): void
    {
        Notification::fake();
        $super = $this->makeAdmin('super_admin');
        $r = $this->postJson('/api/v1/auth/login', ['email' => $super->email, 'password' => 'Secret#Pass123', 'portal' => 'super'])
            ->assertOk()->assertJsonPath('two_factor_required', true)->assertJsonMissingPath('token');

        $this->postJson('/api/v1/auth/2fa/verify', ['challenge' => $r->json('challenge'), 'code' => '000000'])->assertUnprocessable();
        $this->postJson('/api/v1/auth/2fa/verify', ['challenge' => $r->json('challenge'), 'code' => $this->lastCode($super->email)])->assertOk()->assertJsonStructure(['token']);
    }

    public function test_suspended_user_cannot_log_in(): void
    {
        $u = $this->seeker(2);
        $u->update(['status' => 'suspended']);
        $this->postJson('/api/v1/auth/login', ['email' => $u->email, 'password' => 'Demo@12345', 'portal' => 'user'])->assertForbidden();
    }
}
