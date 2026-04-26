<?php

namespace App\Enums;

enum RequestStatusEnum: int
{
    case Processing  = 1;
    case ReadyToClaim = 2;
    case Completed   = 3;
    case Forfeited   = 4;
    case Cancelled   = 5;

    /** Notification trigger slug for each terminal/transitional status. */
    public function notificationTrigger(): ?string
    {
        return match ($this) {
            self::Processing  => 'request_processing',
            self::ReadyToClaim => 'ready_to_claim',
            self::Completed   => 'request_completed',
            self::Forfeited   => 'request_forfeited',
            self::Cancelled   => null,
        };
    }
}
