<?php

namespace App\Notifications;

use App\Models\Application;

class ApplicationSubmittedNotification extends BaseNotification
{
    protected ?string $preferenceKey = 'application_updates';

    public function __construct(private Application $application) { parent::__construct(); }

    protected function title(): string { return 'Application submitted: '.$this->application->job->title; }
    protected function body(): string
    {
        return "Your application for \"{$this->application->job->title}\" at {$this->application->job->company_display_name} has been submitted.\nApplication ID: {$this->application->application_no}\nYou can track its status from your dashboard.";
    }
    protected function url(): ?string { return '/seeker/applications/'.$this->application->id; }
    protected function category(): string { return 'application'; }
}
