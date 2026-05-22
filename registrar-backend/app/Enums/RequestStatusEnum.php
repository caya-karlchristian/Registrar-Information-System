<?php

namespace App\Enums;

enum RequestStatusEnum: int
{
    case Processing  = 1;
    case ReadyToClaim = 2;
    case Completed   = 3;
    case Forfeited   = 4;
    case Cancelled   = 5;

    /**
     * Returns the set of statuses that this status may legally transition to.
     * Used by DocumentRequestService::updateRequest() to reject illegal moves.
     *
     * Transition map:
     *   Processing   → ReadyToClaim | Cancelled
     *   ReadyToClaim → Completed    | Forfeited
     *   Completed    → (terminal)
     *   Forfeited    → (terminal)
     *   Cancelled    → (terminal)
     *
     * Note: the automated shredder (ShredExpiredRequests) transitions
     * ReadyToClaim → Forfeited by writing directly to the DB, so it
     * bypasses this guard intentionally.
     *
     * @return array<self>
     */
    public function allowedTransitions(): array
    {
        return match ($this) {
            self::Processing   => [self::ReadyToClaim, self::Cancelled],
            self::ReadyToClaim => [self::Completed, self::Forfeited],
            self::Completed    => [],
            self::Forfeited    => [],
            self::Cancelled    => [],
        };
    }

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
