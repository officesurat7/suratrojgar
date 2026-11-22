<?php

namespace App\Services;

use App\Models\Job;
use App\Models\User;
use App\Notifications\AdminAlertNotification;
use App\Notifications\JobDecisionNotification;
use Illuminate\Support\Facades\Notification;
use Illuminate\Validation\ValidationException;

/** Job status transitions shared by employer and admin controllers. */
class JobWorkflow
{
    public function __construct(private Settings $settings, private FeaturedJobs $featured) {}

    public function needsManualApproval(Job $job): bool
    {
        return match ($this->settings->get('job_approval_mode')) {
            'auto' => false,
            'selected_categories' => (bool) $job->employerProfile?->businessCategory?->requires_job_approval,
            default => true,
        };
    }

    /** Employer submits a draft (or edits an active job). */
    public function submit(Job $job, User $actor): Job
    {
        $employer = $job->employer;
        if ($this->settings->get('employer_must_be_verified_to_post') && ! $employer->employerProfile?->verified_at) {
            throw ValidationException::withMessages(['status' => 'Your employer account is awaiting verification. You can save drafts, and submit once verified.']);
        }
        if (! $employer->isActive()) {
            throw ValidationException::withMessages(['status' => 'Your account is not active.']);
        }
        $this->ensureExpiry($job);
        $job->submitted_at = now();

        if ($this->needsManualApproval($job)) {
            $job->status = 'pending';
            $job->save();
            Notification::send(AdminAlertNotification::recipients('jobs.approve'), new AdminAlertNotification(
                'job_pending', 'New job awaiting approval', "\"{$job->title}\" by {$job->company_display_name} needs review.", '/admin/jobs?status=pending'
            ));
        } else {
            $this->publish($job, null);
        }

        return $job;
    }

    public function approve(Job $job, User $admin): Job
    {
        if (! in_array($job->status, ['pending', 'rejected', 'draft'], true)) {
            throw ValidationException::withMessages(['status' => 'Only pending jobs can be approved.']);
        }
        $this->ensureExpiry($job);
        $job->approved_by = $admin->id;
        $this->publish($job, $admin);
        $job->employer->notify(new JobDecisionNotification($job, 'approved'));

        return $job;
    }

    public function reject(Job $job, User $admin, string $reason): Job
    {
        $old = $job->status;
        $job->status = 'rejected';
        $job->rejection_reason = $reason;
        $job->save();
        $this->featured->remove($job->id, $admin->id, 'job_rejected');
        Audit::log('job.rejected', $job, ['status' => $old], ['status' => 'rejected', 'reason' => $reason]);
        $job->employer->notify(new JobDecisionNotification($job, 'rejected'));
        JobSearch::bumpCacheVersion();

        return $job;
    }

    /** pause | activate | close | reopen | expire */
    public function transition(Job $job, string $action, User $actor): Job
    {
        $old = $job->status;
        $allowed = [
            'pause' => ['active'],
            'activate' => ['paused'],
            'close' => ['active', 'paused', 'pending', 'expired'],
            'reopen' => ['closed', 'expired'],
            'expire' => ['active', 'paused'],
        ];
        if (! isset($allowed[$action]) || ! in_array($old, $allowed[$action], true)) {
            throw ValidationException::withMessages(['status' => "This job cannot be {$action}d from status \"{$old}\"."]);
        }

        switch ($action) {
            case 'pause': $job->status = 'paused'; break;
            case 'activate': $job->status = 'active'; break;
            case 'close': $job->status = 'closed'; break;
            case 'expire': $job->status = 'expired'; $job->expires_at = now(); break;
            case 'reopen':
                if ($job->expires_at && $job->expires_at->isPast()) {
                    $job->expires_at = now()->addDays((int) $this->settings->get('job_default_expiry_days'));
                    $job->expiry_reminder_sent_at = null;
                }
                // Re-opened jobs go through approval again unless the actor is an admin
                if ($actor->isAdminType() || ! $this->needsManualApproval($job)) {
                    $job->status = 'active';
                } else {
                    $job->status = 'pending';
                }
                break;
        }
        $job->save();
        if ($job->status !== 'active') {
            $this->featured->remove($job->id, $actor->id, 'job_'.$job->status);
        }
        Audit::log('job.'.$action, $job, ['status' => $old], ['status' => $job->status]);
        JobSearch::bumpCacheVersion();

        return $job;
    }

    private function publish(Job $job, ?User $admin): void
    {
        $job->status = 'active';
        $job->approved_at = now();
        $job->published_at ??= now();
        $job->rejection_reason = null;
        $job->save();
        Audit::log('job.published', $job, [], ['status' => 'active'], $admin?->id);
        JobSearch::bumpCacheVersion();
    }

    private function ensureExpiry(Job $job): void
    {
        $max = now()->addDays((int) $this->settings->get('job_max_expiry_days'));
        if (! $job->expires_at || $job->expires_at->isPast()) {
            $job->expires_at = now()->addDays((int) $this->settings->get('job_default_expiry_days'));
        } elseif ($job->expires_at->gt($max)) {
            $job->expires_at = $max;
        }
    }
}
