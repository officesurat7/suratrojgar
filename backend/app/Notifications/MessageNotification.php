<?php

namespace App\Notifications;

/** Generic titled message (welcome, verification results, account status, complaint updates, ...). */
class MessageNotification extends BaseNotification
{
    public function __construct(
        private string $titleText,
        private string $bodyText,
        private ?string $link = null,
        private string $cat = 'account',
        ?string $preferenceKey = null,
    ) {
        parent::__construct();
        $this->preferenceKey = $preferenceKey;
    }

    protected function title(): string { return $this->titleText; }
    protected function body(): string { return $this->bodyText; }
    protected function url(): ?string { return $this->link; }
    protected function category(): string { return $this->cat; }
}
