<?php

namespace App\Notifications;

use App\Models\Application;
use App\Support\Options;

class ApplicationStatusNotification extends BaseNotification
{
    protected ?string $preferenceKey = 'application_updates';

    public function __construct(private Application $application, private ?string $note = null) { parent::__construct(); }

    public function via(object $notifiable): array
    {
        $channels = parent::via($notifiable);
        // Only important statuses are emailed; every change still appears in the notification centre
        if (! in_array($this->application->status, Options::NOTIFY_STATUSES, true)) {
            $channels = array_values(array_diff($channels, ['mail']));
        }

        return $channels;
    }

    protected function title(): string
    {
        $label = Options::APPLICATION_STATUSES[$this->application->status] ?? $this->application->status;

        return "Application update: {$label}";
    }

    protected function body(): string
    {
        $a = $this->application;
        $lines = ["Your application {$a->application_no} for \"{$a->job->title}\" at {$a->job->company_display_name} is now: ".(Options::APPLICATION_STATUSES[$a->status] ?? $a->status).'.'];
        if ($a->status === 'interview_scheduled' && $a->interview_at) {
            $lines[] = 'Interview: '.$a->interview_at->timezone(config('app.display_timezone'))->format('l, d M Y \a\t h:i A');
            if ($a->interview_details) {
                $lines[] = 'Details: '.$a->interview_details;
            }
        }
        if ($this->note) {
            $lines[] = 'Message from employer: '.$this->note;
        }

        return implode("\n", $lines);
    }

    protected function url(): ?string { return '/seeker/applications/'.$this->application->id; }
    protected function category(): string { return 'application'; }
}
