<?php

namespace App\Notifications;

/** Sent instead of an error when someone tries to register with an existing email/mobile (prevents account enumeration). */
class AccountExistsNotification extends BaseNotification
{
    protected bool $storeInApp = false;

    protected function title(): string { return 'Someone tried to register with your details'; }
    protected function body(): string
    {
        return "A new SuratRojgar registration was attempted using your email address or mobile number, which already belong to an account.\nIf this was you, simply log in or use \"Forgot password\". If not, no action is needed. Your account is safe.";
    }
    protected function url(): ?string { return '/login'; }
}
