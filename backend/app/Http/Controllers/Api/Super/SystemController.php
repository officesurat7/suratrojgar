<?php

namespace App\Http\Controllers\Api\Super;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\ContactAccessLog;
use App\Models\LoginHistory;
use App\Notifications\MessageNotification;
use App\Services\Audit;
use App\Services\Settings;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Notification;

class SystemController extends Controller
{
    public function settings(Settings $settings): JsonResponse
    {
        return response()->json([
            'data' => $settings->grouped(),
            // Read-only view of secret-backed configuration (values from .env, never returned in full)
            'environment' => [
                'app_env' => config('app.env'),
                'app_debug' => (bool) config('app.debug'),
                'mail_mailer' => config('mail.default'),
                'mail_host' => config('mail.mailers.smtp.host'),
                'mail_username' => self::mask((string) config('mail.mailers.smtp.username')),
                'mail_password_set' => (bool) config('mail.mailers.smtp.password'),
                'mail_from' => config('mail.from.address'),
                'queue' => config('queue.default'),
                'cache' => config('cache.default'),
                'session' => config('session.driver'),
                'clamav' => (bool) config('services.clamav.socket'),
                'php' => PHP_VERSION,
                'laravel' => app()->version(),
                'timezone' => config('app.timezone').' (display: '.config('app.display_timezone').')',
            ],
        ]);
    }

    public function updateSettings(Request $request, Settings $settings): JsonResponse
    {
        $data = $request->validate([
            'settings' => ['required', 'array'],
            'settings.job_approval_mode' => ['sometimes', 'in:auto,manual,selected_categories'],
            'settings.support_email' => ['sometimes', 'nullable', 'email'],
            'settings.grievance_officer_email' => ['sometimes', 'nullable', 'email'],
            'settings.admin_alert_email' => ['sometimes', 'nullable', 'email'],
            'settings.backup_time' => ['sometimes', 'regex:/^([01]\d|2[0-3]):[0-5]\d$/'],
            'settings.job_default_expiry_days' => ['sometimes', 'integer', 'min:1', 'max:365'],
            'settings.job_max_expiry_days' => ['sometimes', 'integer', 'min:1', 'max:365'],
            'settings.otp_ttl_minutes' => ['sometimes', 'integer', 'min:2', 'max:30'],
            'settings.otp_max_attempts' => ['sometimes', 'integer', 'min:3', 'max:10'],
            'settings.login_max_attempts' => ['sometimes', 'integer', 'min:3', 'max:20'],
            'settings.resume_max_kb' => ['sometimes', 'integer', 'min:256', 'max:10240'],
            'settings.*' => ['nullable'],
        ]);
        $before = $settings->all();
        $settings->set($data['settings'], $request->user()->id);
        $after = $settings->all();
        $changed = array_keys(array_diff_assoc(array_map('json_encode', $after), array_map('json_encode', $before)));
        Audit::log('settings.updated', null, array_intersect_key($before, array_flip($changed)), array_intersect_key($after, array_flip($changed)));

        return response()->json(['message' => 'Settings saved.', 'changed' => $changed]);
    }

    public function maintenance(Request $request, Settings $settings): JsonResponse
    {
        $data = $request->validate(['enabled' => ['required', 'boolean'], 'message' => ['nullable', 'string', 'max:300']]);
        $settings->set(['maintenance_mode' => $data['enabled']] + (isset($data['message']) ? ['maintenance_message' => $data['message']] : []), $request->user()->id);
        Audit::log('maintenance.'.($data['enabled'] ? 'enabled' : 'disabled'));

        return response()->json(['message' => $data['enabled'] ? 'Maintenance mode is ON. Public pages show the maintenance message.' : 'Maintenance mode is OFF.']);
    }

    public function testEmail(Request $request): JsonResponse
    {
        $data = $request->validate(['to' => ['required', 'email']]);
        Notification::route('mail', $data['to'])->notifyNow(new MessageNotification('SuratRojgar test email', 'If you can read this, outgoing email is configured correctly.'));
        Audit::log('settings.test_email', null, [], ['to' => $data['to']]);

        return response()->json(['message' => 'Test email sent to '.$data['to'].'. Check the inbox (and spam folder).']);
    }

    public function auditLogs(Request $request): JsonResponse
    {
        $page = AuditLog::with('user:id,name,user_type')
            ->when($request->action, fn ($q, $v) => $q->where('action', 'like', addcslashes($v, '%_\\').'%'))
            ->when($request->user_id, fn ($q, $v) => $q->where('user_id', $v))
            ->when($request->from, fn ($q, $v) => $q->where('created_at', '>=', $v))
            ->when($request->to, fn ($q, $v) => $q->where('created_at', '<=', $v.' 23:59:59'))
            ->latest('id')->paginate(50);

        return response()->json(['data' => $page->items(), 'meta' => ['current_page' => $page->currentPage(), 'last_page' => $page->lastPage(), 'total' => $page->total()]]);
    }

    public function securityLogs(Request $request): JsonResponse
    {
        $logins = LoginHistory::with('user:id,name,user_type')
            ->when($request->filled('success'), fn ($q) => $q->where('success', $request->boolean('success')))
            ->when($request->email, fn ($q, $v) => $q->where('email', $v))
            ->when($request->ip, fn ($q, $v) => $q->where('ip', $v))
            ->latest('id')->paginate(50);
        $failedByIp = LoginHistory::where('success', false)->where('created_at', '>', now()->subDay())
            ->selectRaw('ip, COUNT(*) c')->groupBy('ip')->orderByDesc('c')->limit(10)->get();
        $contactReveals = ContactAccessLog::where('created_at', '>', now()->subDay())
            ->selectRaw('user_id, COUNT(*) c')->groupBy('user_id')->orderByDesc('c')->limit(10)->with('user:id,name,email')->get();

        return response()->json([
            'data' => $logins->items(),
            'meta' => ['current_page' => $logins->currentPage(), 'last_page' => $logins->lastPage(), 'total' => $logins->total()],
            'failed_by_ip_24h' => $failedByIp,
            'top_contact_viewers_24h' => $contactReveals,
        ]);
    }

    /** Last lines of today's application log (errors, warnings). */
    public function systemLogs(Request $request): JsonResponse
    {
        $files = collect(File::glob(storage_path('logs/*.log')))->sortDesc()->values();
        $file = $request->file && $files->contains(storage_path('logs/'.basename($request->file))) ? storage_path('logs/'.basename($request->file)) : $files->first();
        $lines = [];
        if ($file && File::exists($file)) {
            $size = File::size($file);
            $fh = fopen($file, 'r');
            fseek($fh, max(0, $size - 200_000));
            $chunk = stream_get_contents($fh);
            fclose($fh);
            $lines = array_slice(preg_split('/\n(?=\[\d{4}-\d{2}-\d{2})/', $chunk), -200);
        }
        // Redact anything that looks like a secret before it leaves the server
        $lines = array_map(fn ($l) => preg_replace('/(password|secret|token|key)(["\']?\s*[:=]\s*["\']?)[^\s"\',]+/i', '$1$2[redacted]', mb_substr($l, 0, 4000)), $lines);

        return response()->json(['files' => $files->map(fn ($f) => basename($f)), 'file' => $file ? basename($file) : null, 'lines' => array_reverse($lines)]);
    }

    // ---------------- Backups ----------------
    public function backups(Settings $settings): JsonResponse
    {
        $dir = config('services.backup.path');
        $files = File::isDirectory($dir) ? collect(File::files($dir))->filter(fn ($f) => str_ends_with($f->getFilename(), '.sql.gz'))
            ->sortByDesc(fn ($f) => $f->getMTime())->values()->map(fn ($f) => ['name' => $f->getFilename(), 'size' => $f->getSize(), 'created_at' => date(DATE_ATOM, $f->getMTime())]) : collect();

        return response()->json([
            'path' => $dir, 'writable' => File::isDirectory($dir) && is_writable($dir),
            'settings' => array_intersect_key($settings->all(), array_flip(['backup_enabled', 'backup_time', 'backup_retention_days'])),
            'data' => $files,
        ]);
    }

    public function runBackup(): JsonResponse
    {
        $code = Artisan::call('sr:backup');
        Audit::log('backup.manual_run', null, [], ['exit' => $code]);

        return response()->json(['message' => $code === 0 ? 'Backup created.' : 'Backup failed: '.trim(Artisan::output())], $code === 0 ? 200 : 500);
    }

    private static function mask(string $v): string
    {
        return $v === '' ? '' : mb_substr($v, 0, 2).str_repeat('•', max(3, mb_strlen($v) - 4)).mb_substr($v, -2);
    }
}
