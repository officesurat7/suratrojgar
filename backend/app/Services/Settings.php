<?php

namespace App\Services;

use App\Models\SystemSetting;
use Illuminate\Support\Facades\Cache;

/**
 * Runtime-configurable settings stored in system_settings (managed by Super Admin).
 * Secrets (SMTP password, API keys) are NOT stored here: they live in .env only.
 */
class Settings
{
    public const DEFAULTS = [
        // general (public)
        'site_name' => ['SuratRojgar', 'general', true],
        'site_tagline' => ["Surat's own job portal", 'general', true],
        'support_email' => ['support@suratrojgar.in', 'general', true],
        'support_phone' => ['', 'general', true],
        'office_address' => ['Surat, Gujarat, India', 'general', true],
        'grievance_officer_name' => ['Grievance Officer', 'compliance', true],
        'grievance_officer_email' => ['grievance@suratrojgar.in', 'compliance', true],
        'maintenance_mode' => [false, 'general', true],
        'maintenance_message' => ['We are upgrading SuratRojgar. Please check back shortly.', 'general', true],
        // jobs
        'job_approval_mode' => ['manual', 'jobs', false],          // auto | manual | selected_categories
        'job_default_expiry_days' => [30, 'jobs', false],
        'job_max_expiry_days' => [90, 'jobs', false],
        'job_expiry_reminder_days' => [3, 'jobs', false],
        'employer_must_be_verified_to_post' => [true, 'jobs', false],
        'employer_auto_activate' => [false, 'jobs', false],        // skip manual employer verification
        'duplicate_job_window_days' => [30, 'jobs', false],
        'max_jobs_per_employer_per_day' => [20, 'jobs', false],
        // security
        'otp_length' => [6, 'security', false],
        'otp_ttl_minutes' => [10, 'security', false],
        'otp_max_attempts' => [5, 'security', false],
        'otp_resend_cooldown_seconds' => [60, 'security', false],
        'otp_max_per_hour' => [5, 'security', false],
        'login_max_attempts' => [5, 'security', false],
        'login_lockout_minutes' => [15, 'security', false],
        'require_admin_2fa' => [false, 'security', false],         // Super Admin always requires a 2nd factor
        'contact_views_per_day' => [50, 'security', false],
        'resume_max_kb' => [5120, 'security', false],
        // notifications / mail (non-secret)
        'mail_from_name' => ['SuratRojgar', 'mail', false],
        'admin_alert_email' => ['', 'mail', false],
        // data retention (days)
        'retention_visitor_analytics_days' => [180, 'retention', false],
        'retention_search_logs_days' => [180, 'retention', false],
        'retention_login_history_days' => [365, 'retention', false],
        'retention_deleted_accounts_days' => [30, 'retention', false],
        // backups
        'backup_enabled' => [true, 'backup', false],
        'backup_time' => ['02:30', 'backup', false],
        'backup_retention_days' => [14, 'backup', false],
        // integrations (non-secret toggles)
        'analytics_enabled' => [true, 'integrations', false],
        'mobile_verification_enabled' => [false, 'integrations', false],
        'paid_services_enabled' => [false, 'integrations', true],
    ];

    private const CACHE_KEY = 'system_settings:all';

    public function all(): array
    {
        try {
            $stored = Cache::remember(self::CACHE_KEY, 600, fn () => SystemSetting::query()->pluck('value', 'key')->all());
        } catch (\Throwable) {
            $stored = [];   // DB/cache not reachable yet (install, migrations): fall back to defaults
        }
        $out = [];
        foreach (self::DEFAULTS as $key => [$default]) {
            $out[$key] = array_key_exists($key, $stored) ? $stored[$key] : $default;
        }

        return $out;
    }

    public function get(string $key, mixed $fallback = null): mixed
    {
        return $this->all()[$key] ?? $fallback;
    }

    public function public(): array
    {
        return array_intersect_key($this->all(), array_filter(self::DEFAULTS, fn ($d) => $d[2]));
    }

    public function grouped(): array
    {
        $all = $this->all();
        $out = [];
        foreach (self::DEFAULTS as $key => [$default, $group]) {
            $out[$group][$key] = $all[$key];
        }

        return $out;
    }

    public function set(array $values, ?int $userId = null): void
    {
        foreach ($values as $key => $value) {
            if (! array_key_exists($key, self::DEFAULTS)) {
                continue;
            }
            [$default, $group, $public] = self::DEFAULTS[$key];
            // Coerce to the default's type
            $value = match (gettype($default)) {
                'boolean' => filter_var($value, FILTER_VALIDATE_BOOLEAN),
                'integer' => (int) $value,
                default => (string) ($value ?? ''),
            };
            SystemSetting::updateOrCreate(['key' => $key], ['value' => $value, 'group' => $group, 'is_public' => $public, 'updated_by' => $userId]);
        }
        Cache::forget(self::CACHE_KEY);
    }
}
