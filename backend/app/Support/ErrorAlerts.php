<?php

namespace App\Support;

use App\Notifications\AdminAlertNotification;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Notification;

/** Notifies Super Admins about server errors, at most once per error signature every 30 minutes. */
final class ErrorAlerts
{
    public static function maybeNotify(\Throwable $e): void
    {
        if (app()->runningUnitTests() || $e instanceof \Illuminate\Validation\ValidationException
            || $e instanceof \Symfony\Component\HttpKernel\Exception\HttpExceptionInterface
            || $e instanceof \Illuminate\Auth\AuthenticationException) {
            return;
        }
        try {
            $sig = 'err-alert:'.sha1(get_class($e).$e->getFile().$e->getLine());
            if (! Cache::add($sig, 1, now()->addMinutes(30))) {
                return;
            }
            Notification::send(AdminAlertNotification::recipients('logs.view'), new AdminAlertNotification(
                'system_error', 'System error: '.class_basename($e), mb_substr($e->getMessage(), 0, 300).' ('.basename($e->getFile()).':'.$e->getLine().')', '/super-admin/logs'
            ));
        } catch (\Throwable) {
            // never let alerting break error handling
        }
    }
}
