<?php

namespace App\Notifications;

use App\Models\Application;

class NewApplicationNotification extends BaseNotification
{
    protected ?string $preferenceKey = 'application_updates';

    public function __construct(private Application $application) { parent::__construct(); }

    protected function title(): string { return 'New application for '.$this->application->job->title; }
    protected function body(): string
    {
        return "{$this->application->user->name} applied for \"{$this->application->job->title}\".\nApplication ID: {$this->application->application_no}";
    }
    protected function url(): ?string { return '/employer/applications/'.$this->application->id; }
    protected function category(): string { return 'application'; }
}
