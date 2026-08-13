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
     * A request whose registrar-side work is done but which cannot move to
     * ReadyToClaim yet because it is waiting on a signature from an office
     * outside the Registrar's control (department head, dean, etc.).
     *
     * status_id = 6 is intentionally reused from a prior, abandoned attempt
     * at a "Pending" status — see the pre-flight check and full history in
     * migration 2026_08_15_000000_add_pending_signature_status and the
     * matching comment in DatabaseSeeder::seedRequestStatus(). This one is
     * named "Pending Signature" (not "Pending"), which does not collide
     * with the frontend's exact-match "pending" lookup.
     *
     * Introduced so the registrar's own SLA clock can stop the moment
     * their part is done, instead of either (a) keeping "Processing"
     * active while waiting on someone else — which unfairly counts
     * against the registrar in performance reports — or (b) marking it
     * "Ready to Claim" early, which tells the user to come pick up a
     * document that isn't actually ready yet. See
     * DocumentRequestService::recordStatusHistory() and
     * BusinessCalendarService for how the two SLA clocks (registrar time
     * vs. signature-office time) are measured separately once a request
     * passes through this status.
     */
    case PendingSignature = 6;

    /**
     * Returns the set of statuses that this status may legally transition to.
     * Used by DocumentRequestService::updateRequest() to reject illegal moves.
     *
     * Transition map:
     *   Processing       → ReadyToClaim | PendingSignature
     *   PendingSignature → ReadyToClaim
     *   ReadyToClaim     → Completed    | Forfeited
     *   Completed        → (terminal)
     *   Forfeited        → (terminal)
     *   Cancelled        → (terminal, and unreachable from any other status — see
     *                       the @deprecated note on the Cancelled case above)
     *
     * Note: the automated shredder (ShredExpiredRequests) transitions
     * ReadyToClaim → Forfeited by writing directly to the DB, so it
     * bypasses this guard intentionally.
     *
     * PendingSignature is reachable only from Processing, and can only
     * ever move forward to ReadyToClaim — a document either comes back
     * signed (→ ReadyToClaim) or it doesn't yet, in which case it simply
     * stays in PendingSignature. There is deliberately no PendingSignature
     * → Processing "undo": if staff need to correct a mistaken transition,
     * that's a data-correction operation, not a normal workflow move, and
     * should not be modeled as one more state the SLA clock has to reason
     * about.
     *
     * @return array<self>
     */
    public function allowedTransitions(): array
    {
        return match ($this) {
            self::Processing       => [self::ReadyToClaim, self::PendingSignature],
            self::PendingSignature => [self::ReadyToClaim],
            self::ReadyToClaim     => [self::Completed, self::Forfeited],
            self::Completed        => [],
            self::Forfeited        => [],
            self::Cancelled        => [],
        };
    }

    /** Notification trigger slug for each terminal/transitional status. */
    public function notificationTrigger(): ?string
    {
        return match ($this) {
            self::Processing       => 'request_processing',
            self::PendingSignature => 'pending_signature',
            self::ReadyToClaim     => 'ready_to_claim',
            self::Completed        => 'request_completed',
            self::Forfeited        => 'request_forfeited',
            self::Cancelled        => null,
        };
    }
}