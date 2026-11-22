<?php

namespace App\Notifications;

use App\Models\Job;

class JobDecisionNotification extends BaseNotification
{
    protected ?string $preferenceKey = 'job_updates';

    public function __construct(private Job $job, private string $decision)
    {
        parent::__construct();
    }

    protected function title(): string
    {
        return match ($this->decision) {
            'approved' => 'Your job is live: '.$this->job->title,
            'rejected' => 'Your job needs changes: '.$this->job->title,
            'expiring' => 'Your job expires soon: '.$this->job->title,
            'expired' => 'Your job has expired: '.$this->job->title,
            default => 'Job update: '.$this->job->title,
        };
    }

    protected function body(): string
    {
        return match ($this->decision) {
            'approved' => 'Good news! Your job post has been approved and is now visible to job seekers in Surat.',
            'rejected' => "Your job post was not approved.\nReason: ".($this->job->rejection_reason ?: 'Not specified').".\nPlease edit the job and submit it again.",
            'expiring' => 'Your job post will expire on '.$this->job->expires_at?->timezone(config('app.display_timezone'))->format('d M Y').'. Extend it from your dashboard if you are still hiring.',
            'expired' => 'Your job post has expired and is no longer shown to job seekers. You can reopen it from your dashboard.',
            default => '',
        };
    }

    protected function url(): ?string { return '/employer/jobs/'.$this->job->id; }
    protected function category(): string { return 'job'; }
}
