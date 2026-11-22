<?php

namespace App\Notifications;

use App\Models\User;
use Illuminate\Support\Collection;

class AdminAlertNotification extends BaseNotification
{
    protected ?string $preferenceKey = 'admin_alerts';

    public function __construct(private string $kind, private string $titleText, private string $bodyText, private ?string $link = null)
    {
        parent::__construct();
    }

    /** Active admin-type users who hold the given permission. */
    public static function recipients(string $permission): Collection
    {
        return User::whereIn('user_type', ['admin', 'super_admin', 'admin_staff'])->where('status', 'active')->get()
            ->filter(fn (User $u) => $u->hasPermission($permission))->values();
    }

    protected function title(): string { return $this->titleText; }
    protected function body(): string { return $this->bodyText; }
    protected function url(): ?string { return $this->link; }
    protected function category(): string { return 'admin:'.$this->kind; }
}
