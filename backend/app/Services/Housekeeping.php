<?php

namespace App\Services;

use App\Models\Job;
use App\Models\JobSeekerProfile;
use App\Notifications\AdminAlertNotification;
use App\Notifications\JobDecisionNotification;
use App\Notifications\MatchingJobsNotification;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Notification;

/** Background jobs run by the scheduler (see routes/console.php). */
class Housekeeping
{
    public function __construct(private Settings $settings, private FeaturedJobs $featured) {}

    /** Mark jobs past their expiry date as expired, notify employers, drop them from the priority list. */
    public function expireJobs(): int
    {
        $count = 0;
        Job::with('employer')->where('status', 'active')->whereNotNull('expires_at')->where('expires_at', '<=', now())
            ->chunkById(200, function ($jobs) use (&$count) {
                foreach ($jobs as $job) {
                    $job->status = 'expired';
                    $job->save();
                    $job->employer?->notify(new JobDecisionNotification($job, 'expired'));
                    $count++;
                }
            });
        $pruned = $this->featured->prune();
        if ($count || $pruned) {
            JobSearch::bumpCacheVersion();
        }

        return $count;
    }

    public function expiryReminders(): int
    {
        $days = (int) $this->settings->get('job_expiry_reminder_days');
        $count = 0;
        Job::with('employer')->where('status', 'active')->whereNull('expiry_reminder_sent_at')
            ->whereBetween('expires_at', [now(), now()->addDays($days)])
            ->chunkById(200, function ($jobs) use (&$count) {
                foreach ($jobs as $job) {
                    $job->employer?->notify(new JobDecisionNotification($job, 'expiring'));
                    $job->forceFill(['expiry_reminder_sent_at' => now()])->saveQuietly();
                    $count++;
                }
            });

        return $count;
    }

    /** Daily "new jobs matching your preferences" digest. */
    public function jobAlerts(): int
    {
        $since = now()->subDay();
        $newJobs = Job::publiclyVisible()->with('locality')->where('published_at', '>=', $since)->get();
        if ($newJobs->isEmpty()) {
            return 0;
        }
        $sent = 0;
        JobSeekerProfile::with('user')->whereHas('user', fn ($u) => $u->where('status', 'active')->whereNotNull('email_verified_at'))
            ->where(fn ($q) => $q->whereNotNull('preferred_category_id')->orWhereNotNull('preferred_role_id'))
            ->chunkById(500, function ($profiles) use ($newJobs, &$sent) {
                foreach ($profiles as $p) {
                    $matches = $newJobs->filter(fn ($j) => ($p->preferred_role_id && $j->job_role_id === $p->preferred_role_id)
                        || ($p->preferred_category_id && $j->job_category_id === $p->preferred_category_id
                            && (! $p->preferred_job_type || $j->employment_type === $p->preferred_job_type)));
                    if ($p->preferred_locality_id) {   // nearby/preferred locality first
                        $matches = $matches->sortByDesc(fn ($j) => $j->locality_id === $p->preferred_locality_id);
                    }
                    if ($matches->isNotEmpty() && $p->user->wantsNotification('job_alerts')) {
                        $p->user->notify(new MatchingJobsNotification($matches->values()));
                        $sent++;
                    }
                }
            });

        return $sent;
    }

    /** Flag unusual activity to admins (bulk applying bots, mass posting). */
    public function anomalyCheck(): void
    {
        $hour = now()->subHour();
        $heavyAppliers = DB::table('applications')->where('created_at', '>=', $hour)->selectRaw('user_id, COUNT(*) c')->groupBy('user_id')->having('c', '>=', 30)->get();
        foreach ($heavyAppliers as $row) {
            if (Cache::add('anomaly:apply:'.$row->user_id, 1, now()->addHours(6))) {
                Notification::send(AdminAlertNotification::recipients('job_seekers.manage'), new AdminAlertNotification(
                    'unusual_applications', 'Unusual application activity', "Job seeker #{$row->user_id} submitted {$row->c} applications in the last hour.", '/admin/candidates/'.$row->user_id
                ));
            }
        }
        $jobSpikes = DB::table('applications')->where('created_at', '>=', $hour)->selectRaw('job_id, COUNT(*) c')->groupBy('job_id')->having('c', '>=', 200)->get();
        foreach ($jobSpikes as $row) {
            if (Cache::add('anomaly:job:'.$row->job_id, 1, now()->addHours(6))) {
                Notification::send(AdminAlertNotification::recipients('applications.view'), new AdminAlertNotification(
                    'unusual_applications', 'Application spike on a job', "Job #{$row->job_id} received {$row->c} applications in the last hour.", '/admin/jobs/'.$row->job_id
                ));
            }
        }
        $heavyPosters = DB::table('jobs')->where('created_at', '>=', $hour)->selectRaw('employer_id, COUNT(*) c')->groupBy('employer_id')->having('c', '>=', 10)->get();
        foreach ($heavyPosters as $row) {
            if (Cache::add('anomaly:post:'.$row->employer_id, 1, now()->addHours(6))) {
                Notification::send(AdminAlertNotification::recipients('employers.manage'), new AdminAlertNotification(
                    'suspicious_employer', 'Suspicious employer activity', "Employer #{$row->employer_id} created {$row->c} jobs in the last hour.", '/admin/employers/'.$row->employer_id
                ));
            }
        }
    }

    /** Data retention (DPDP: keep personal/usage data only as long as needed). */
    public function retention(): array
    {
        $s = $this->settings;
        $out = [
            'visitor_analytics' => DB::table('visitor_analytics')->where('created_at', '<', now()->subDays((int) $s->get('retention_visitor_analytics_days')))->delete(),
            'search_logs' => DB::table('search_logs')->where('created_at', '<', now()->subDays((int) $s->get('retention_search_logs_days')))->delete(),
            'login_history' => DB::table('login_history')->where('created_at', '<', now()->subDays((int) $s->get('retention_login_history_days')))->delete(),
            'job_views' => DB::table('job_views')->where('created_at', '<', now()->subDays((int) $s->get('retention_visitor_analytics_days')))->delete(),
            'email_otps' => DB::table('email_otps')->where('created_at', '<', now()->subDay())->delete(),
            'contact_access_logs' => DB::table('contact_access_logs')->where('created_at', '<', now()->subDays(365))->delete(),
            // Never-verified signups older than 7 days
            'stale_signups' => DB::table('users')->whereNull('email_verified_at')->where('created_at', '<', now()->subDays(7))->whereIn('user_type', ['job_seeker', 'employer'])->update(['deleted_at' => now(), 'mobile' => null]),
        ];

        return $out;
    }
}
