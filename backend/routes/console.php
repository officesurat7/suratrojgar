<?php

use App\Services\Analytics;
use App\Services\Housekeeping;
use App\Services\Settings;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Schedule;
use Symfony\Component\Process\Process;

/*
| Scheduled & maintenance commands. Cron on the server runs `php artisan schedule:run` every minute
| (see deploy/cron/suratrojgar). Times are IST. Heavy tasks run onOneServer() so multiple app servers are safe.
*/

Artisan::command('sr:expire-jobs', function (Housekeeping $h) {
    $this->info('Expired '.$h->expireJobs().' job(s).');
})->purpose('Expire jobs past their expiry date and clean the priority list');

Artisan::command('sr:expiry-reminders', function (Housekeeping $h) {
    $this->info('Sent '.$h->expiryReminders().' reminder(s).');
})->purpose('Email employers whose jobs expire soon');

Artisan::command('sr:job-alerts', function (Housekeeping $h) {
    $this->info('Sent '.$h->jobAlerts().' job alert digest(s).');
})->purpose('Send daily matching-jobs digests to job seekers');

Artisan::command('sr:anomaly-check', function (Housekeeping $h) {
    $h->anomalyCheck();
})->purpose('Alert admins about unusual application/posting activity');

Artisan::command('sr:retention', function (Housekeeping $h) {
    foreach ($h->retention() as $table => $n) {
        $this->line("{$table}: {$n}");
    }
})->purpose('Apply data retention policies');

Artisan::command('sr:analytics-flush', function (Analytics $a) {
    $this->info('Flushed '.$a->flush().' event(s).');
})->purpose('Move buffered visitor events from Redis to MySQL');

Artisan::command('sr:analytics-rollup {date?}', function (Analytics $a, ?string $date = null) {
    $day = $date ? CarbonImmutable::parse($date, config('app.display_timezone')) : CarbonImmutable::now(config('app.display_timezone'))->subDay();
    $a->rollup($day);
    $this->info('Rolled up '.$day->toDateString());
})->purpose('Aggregate visitor analytics for a day (default: yesterday)');

Artisan::command('sr:backup', function (Settings $settings) {
    $dir = config('services.backup.path');
    File::ensureDirectoryExists($dir, 0750);
    $db = config('database.connections.mysql');
    $file = $dir.'/suratrojgar-'.now()->format('Ymd-His').'.sql.gz';
    // Credentials passed via a temporary option file, never on the command line (visible in `ps`)
    $cnf = tempnam(sys_get_temp_dir(), 'srdb');
    file_put_contents($cnf, "[client]\nuser=\"{$db['username']}\"\npassword=\"{$db['password']}\"\nhost=\"{$db['host']}\"\nport=\"{$db['port']}\"\n");
    chmod($cnf, 0600);
    $cmd = 'mysqldump --defaults-extra-file='.escapeshellarg($cnf).' --single-transaction --quick --routines --no-tablespaces '
        .escapeshellarg($db['database']).' | gzip -9 > '.escapeshellarg($file);
    $p = new Process(['bash', '-c', 'set -o pipefail; '.$cmd]);
    $p->setTimeout(3600)->run();
    @unlink($cnf);
    if (! $p->isSuccessful() || ! File::exists($file) || File::size($file) < 100) {
        @unlink($file);
        $this->error('Backup failed: '.trim($p->getErrorOutput()));

        return 1;
    }
    chmod($file, 0640);
    $keep = (int) $settings->get('backup_retention_days');
    foreach (File::files($dir) as $f) {
        if (str_ends_with($f->getFilename(), '.sql.gz') && $f->getMTime() < now()->subDays($keep)->getTimestamp()) {
            File::delete($f->getPathname());
        }
    }
    $this->info('Backup written to '.$file);

    return 0;
})->purpose('Create a compressed MySQL backup and prune old ones');

// ---------------- Schedule ----------------
$tz = config('app.display_timezone', 'Asia/Kolkata');
Schedule::command('sr:analytics-flush')->everyMinute()->withoutOverlapping()->onOneServer();
Schedule::command('sr:expire-jobs')->everyFiveMinutes()->withoutOverlapping()->onOneServer();
Schedule::command('sr:anomaly-check')->hourly()->onOneServer();
Schedule::command('sr:analytics-rollup')->dailyAt('00:20')->timezone($tz)->onOneServer();
Schedule::command('sr:job-alerts')->dailyAt('08:00')->timezone($tz)->onOneServer();
Schedule::command('sr:expiry-reminders')->dailyAt('09:30')->timezone($tz)->onOneServer();
Schedule::command('sr:retention')->dailyAt('03:30')->timezone($tz)->onOneServer();
Schedule::command('sanctum:prune-expired --hours=24')->daily()->onOneServer();
Schedule::command('queue:prune-failed --hours=168')->daily()->onOneServer();
Schedule::command('sr:backup')->dailyAt(app(Settings::class)->get('backup_time', '02:30'))->timezone($tz)
    ->when(fn () => (bool) app(Settings::class)->get('backup_enabled'))->onOneServer();

Artisan::command('sr:create-super-admin {--email=} {--name=}', function () {
    $email = strtolower($this->option('email') ?: $this->ask('Super Admin email'));
    $name = $this->option('name') ?: $this->ask('Full name', 'Super Admin');
    if (! filter_var($email, FILTER_VALIDATE_EMAIL)) {
        $this->error('Invalid email.');

        return 1;
    }
    $password = getenv('SR_SUPERADMIN_PASSWORD') ?: $this->secret('Password (min 12 chars, letters + numbers + symbols)');
    $v = validator(['password' => $password], ['password' => [\Illuminate\Validation\Rules\Password::min(12)->letters()->numbers()->symbols()->mixedCase()]]);
    if ($v->fails()) {
        $this->error($v->errors()->first());

        return 1;
    }
    $user = \App\Models\User::updateOrCreate(['email' => $email], [
        'name' => $name, 'user_type' => 'super_admin', 'status' => 'active', 'password' => $password, 'email_verified_at' => now(),
    ]);
    \App\Models\AdminProfile::firstOrCreate(['user_id' => $user->id], ['designation' => 'Super Admin']);
    $user->roles()->sync(\App\Models\Role::where('name', 'super_admin')->pluck('id'));
    \App\Services\Audit::log('superadmin.created_cli', $user, [], ['email' => $email], $user->id);
    $this->info("Super Admin ready: {$email}. Log in at /super-admin/login (a second factor is always required).");

    return 0;
})->purpose('Create or reset the Super Admin account (interactive; no passwords in code)');
