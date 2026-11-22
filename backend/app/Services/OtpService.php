<?php

namespace App\Services;

use App\Models\EmailOtp;
use App\Notifications\OtpCodeNotification;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Str;

/**
 * Email OTPs: cryptographically random, hashed at rest, short-lived, attempt-limited,
 * with resend cooldown and an hourly cap per email address.
 */
class OtpService
{
    public function __construct(private Settings $settings) {}

    /** @return array{sent: bool, retry_after: int} */
    public function send(string $email, string $purpose, ?string $ip = null): array
    {
        $email = Str::lower($email);
        $cooldown = (int) $this->settings->get('otp_resend_cooldown_seconds');
        $last = EmailOtp::where('email', $email)->where('purpose', $purpose)->latest('id')->first();

        if ($last && $last->created_at->diffInSeconds(now()) < $cooldown) {
            return ['sent' => false, 'retry_after' => $cooldown - (int) $last->created_at->diffInSeconds(now())];
        }
        $hourly = EmailOtp::where('email', $email)->where('purpose', $purpose)->where('created_at', '>', now()->subHour())->count();
        if ($hourly >= (int) $this->settings->get('otp_max_per_hour')) {
            return ['sent' => false, 'retry_after' => 3600];
        }

        $length = max(4, min(8, (int) $this->settings->get('otp_length')));
        $code = str_pad((string) random_int(0, 10 ** $length - 1), $length, '0', STR_PAD_LEFT);
        $ttl = (int) $this->settings->get('otp_ttl_minutes');

        // Invalidate older unused codes for this purpose
        EmailOtp::where('email', $email)->where('purpose', $purpose)->whereNull('consumed_at')->update(['consumed_at' => now()]);
        EmailOtp::create([
            'email' => $email, 'purpose' => $purpose, 'code_hash' => Hash::make($code),
            'expires_at' => now()->addMinutes($ttl), 'ip' => $ip,
        ]);

        Notification::route('mail', $email)->notify(new OtpCodeNotification($code, $purpose, $ttl));

        return ['sent' => true, 'retry_after' => $cooldown];
    }

    /** Returns true only for a valid, unexpired, unused code. Each wrong guess counts. */
    public function verify(string $email, string $purpose, string $code): bool
    {
        $otp = EmailOtp::where('email', Str::lower($email))->where('purpose', $purpose)
            ->whereNull('consumed_at')->latest('id')->first();

        if (! $otp || $otp->expires_at->isPast()) {
            return false;
        }
        if ($otp->attempts >= (int) $this->settings->get('otp_max_attempts')) {
            $otp->update(['consumed_at' => now()]);   // burn it: user must request a new code

            return false;
        }
        if (! Hash::check($code, $otp->code_hash)) {
            $otp->increment('attempts');

            return false;
        }
        $otp->update(['consumed_at' => now()]);

        return true;
    }
}
