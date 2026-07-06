<?php

namespace App\Enums;

enum RequestStatusEnum: int
{
    case Processing  = 1;
    case ReadyToClaim = 2;
    case Completed   = 3;
    case Forfeited   = 4;

    /**
     * @deprecated Cancelled is being retired as a status going forward.
     * The case is kept (rather than removed) because RequestStatusEnum::from()
     * is called on status_id values read from existing document_request rows
     * (e.g. in notifyOwnerOfStatusChange()) — removing the case would throw a
     * ValueError the first time the app reads a historical row that was
     * already cancelled before this change. allowedTransitions() below no
     * longer permits transitioning INTO Cancelled, so no new row can reach
     * this status; it now only exists to keep old data readable.
     */
    case Cancelled   = 5;

    /**
     * Returns the set of statuses that this status may legally transition to.
     * Used by DocumentRequestService::updateRequest() to reject illegal moves.
     *
     * Transition map:
     *   Processing   → ReadyToClaim
     *   ReadyToClaim → Completed    | Forfeited
     *   Completed    → (terminal)
     *   Forfeited    → (terminal)
     *   Cancelled    → (terminal, and unreachable from any other status — see
     *                   the @deprecated note on the Cancelled case above)
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
            self::Processing   => [self::ReadyToClaim],
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