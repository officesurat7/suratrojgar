<?php

namespace App\Notifications;

use Illuminate\Support\Collection;

class MatchingJobsNotification extends BaseNotification
{
    protected ?string $preferenceKey = 'job_alerts';

    public function __construct(private Collection $jobs) { parent::__construct(); }

    protected function title(): string { return $this->jobs->count().' new jobs match your preferences'; }
    protected function body(): string
    {
        return $this->jobs->take(10)->map(fn ($j) => "• {$j->title} at {$j->company_display_name}".($j->locality ? " ({$j->locality->name})" : ''))->implode("\n");
    }
    protected function url(): ?string { return '/seeker'; }
    protected function category(): string { return 'job_alert'; }
}
