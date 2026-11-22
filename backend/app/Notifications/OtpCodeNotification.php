<?php

namespace App\Notifications;

use Illuminate\Notifications\Messages\MailMessage;

class OtpCodeNotification extends BaseNotification
{
    protected bool $storeInApp = false;

    public function __construct(private string $code, private string $purpose, private int $ttl)
    {
        parent::__construct();
        $this->onQueue('high');
    }

    protected function title(): string
    {
        return match ($this->purpose) {
            'password_reset' => 'Your password reset code',
            'login_2fa' => 'Your login verification code',
            default => 'Verify your email address',
        };
    }

    protected function body(): string { return ''; }

    public function toMail(object $notifiable): MailMessage
    {
        return (new MailMessage)
            ->subject($this->title().': '.$this->code)
            ->greeting('Hello,')
            ->line('Your SuratRojgar verification code is:')
            ->line('**'.$this->code.'**')
            ->line("This code expires in {$this->ttl} minutes. Never share it with anyone. SuratRojgar staff will never ask for it.")
            ->line('If you did not request this, you can safely ignore this email.')
            ->salutation('Team SuratRojgar');
    }
}
