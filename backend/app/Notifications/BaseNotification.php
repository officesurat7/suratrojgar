<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

/**
 * All notifications are queued (Redis) so email never blocks a web request.
 * Each one is stored in the in-dashboard notification centre ("database") and
 * emailed unless the user switched off that (non-essential) category.
 */
abstract class BaseNotification extends Notification implements ShouldQueue
{
    use Queueable;

    /** Preference key; null = essential (always emailed). */
    protected ?string $preferenceKey = null;
    protected bool $storeInApp = true;

    public function __construct()
    {
        $this->onQueue('notifications');
        $this->afterCommit();
    }

    public function via(object $notifiable): array
    {
        $channels = [];
        if ($this->storeInApp && method_exists($notifiable, 'getKey') && ! $notifiable instanceof \Illuminate\Notifications\AnonymousNotifiable) {
            $channels[] = 'database';
        }
        $wantsMail = $this->preferenceKey === null || ! method_exists($notifiable, 'wantsNotification')
            || $notifiable->wantsNotification($this->preferenceKey, 'mail');
        if ($wantsMail) {
            $channels[] = 'mail';
        }

        return $channels;
    }

    abstract protected function title(): string;
    abstract protected function body(): string;

    protected function url(): ?string { return null; }
    protected function category(): string { return 'general'; }

    public function toArray(object $notifiable): array
    {
        return ['title' => $this->title(), 'body' => $this->body(), 'url' => $this->url(), 'category' => $this->category()];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $mail = (new MailMessage)->subject($this->title().' | SuratRojgar')->greeting('Hello'.(isset($notifiable->name) ? ' '.$notifiable->name : '').',');
        foreach (preg_split("/\n+/", $this->body()) as $line) {
            $mail->line($line);
        }
        if ($this->url()) {
            $mail->action('Open SuratRojgar', rtrim(config('app.frontend_url'), '/').$this->url());
        }

        return $mail->salutation('Team SuratRojgar');
    }
}
