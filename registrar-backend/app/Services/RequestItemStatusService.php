<?php

namespace App\Services;

use App\Enums\RequestStatusEnum;
use App\Models\DocumentRequest;
use App\Models\RequestCertificate;
use App\Models\RequestDocument;
use App\Models\RequestHistory;
use App\Models\SystemUser;
use App\Contracts\NotificationServiceInterface;
use App\Services\Concerns\FlushesAnalyticsCache;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

/**
 * Item-level status transitions for request_document / request_certificate
 * — see migration 2026_08_29_000007_add_status_to_request_line_items for the
 * schema this operates on and the full "why" of the design.
 *
 * SCOPE: this service lets staff advance ONE line item (e.g. confirm a
 * single CTC item's source document was received) without forcing every
 * other item on the same request through the same transition at the same
 * time. It does NOT change what a single claim ticket means — claiming
 * still happens once per document_request (see DocumentRequestService::
 * claimRequest()) — it only changes how staff track and progress the work
 * that happens before that point.
 *
 * document_request.status_id remains authoritative for claiming and the
 * student-facing view. Every successful item transition here recomputes it
 * as a derived "earliest-stage-wins" aggregate (see
 * recomputeAggregateStatus()) — the request is only as far along as its
 * least-advanced item.
 *
 * Reuses the exact same primitives DocumentRequestService::updateRequest()
 * already relies on (RequestStatusEnum::allowedTransitions(), the
 * SystemUser::hasModuleAccess() dashboard-action gate, business-calendar-
 * aware segment timing, FlushesAnalyticsCache) rather than duplicating that
 * logic with a different shape — a request-level transition and an
 * item-level transition are the same kind of event at a different
 * granularity, and should stay behaviorally identical wherever the schema
 * doesn't force a difference.
 */
class RequestItemStatusService
{
    use FlushesAnalyticsCache;

    /**
     * Relative progress rank used to pick the aggregate status out of a
     * set of item statuses — lower rank = earlier stage. Terminal
     * statuses (Completed/Forfeited) intentionally share the highest
     * rank: see recomputeAggregateStatus() for how a mixed terminal set
     * is resolved (an edge case that cannot occur yet under today's
     * single-ticket claiming, since Forfeited is only ever written at
     * the request level by the automated shredder — flagged here rather
     * than silently guessed at).
     *
     * Cancelled is deliberately absent — it is unreachable going
     * forward (see RequestStatusEnum::Cancelled's @deprecated note) and
     * is never a value a live item status column should hold.
     */
    private const STAGE_RANK = [
        RequestStatusEnum::AwaitingSubmission->value => 0,
        RequestStatusEnum::Processing->value         => 1,
        RequestStatusEnum::PendingSignature->value   => 2,
        RequestStatusEnum::ReadyToClaim->value       => 3,
        RequestStatusEnum::Completed->value          => 4,
        RequestStatusEnum::Forfeited->value          => 4,
    ];

    public function __construct(
        private NotificationServiceInterface $notificationService,
        private BusinessCalendarService      $businessCalendarService,
    ) {}

    /**
     * Advance a single request_document row's status.
     *
     * @throws \Illuminate\Http\Exceptions\HttpResponseException on an
     *         illegal transition, an archived parent request, or a
     *         missing dashboard permission — same abort() shape as
     *         DocumentRequestService::updateRequest(), so the controller
     *         doesn't need a different error-handling path per endpoint.
     */
    public function advanceDocumentItem(RequestDocument $item, int $targetStatusId): RequestDocument
    {
        return DB::transaction(function () use ($item, $targetStatusId) {
            /** @var RequestDocument $item */
            $item = RequestDocument::lockForUpdate()->findOrFail($item->request_document_id);

            $documentRequest = DocumentRequest::lockForUpdate()
                ->findOrFail($item->request_id);

            $this->guardArchived($documentRequest);

            $targetStatus = $this->validateTransition($item->status_id, $targetStatusId);
            $this->authorizeItemStatusChange($targetStatus);

            $oldStatusId = $item->status_id;
            $item->update(['status_id' => $targetStatus->value]);

            $this->recordItemHistory($documentRequest, $oldStatusId, $targetStatus->value, requestDocumentId: $item->request_document_id);

            $this->recomputeAggregateStatus($documentRequest);

            $this->flushAnalyticsCache();

            return $item->refresh();
        });
    }

    /**
     * Advance a single request_certificate row's status. Mirrors
     * advanceDocumentItem() exactly — kept as a separate method (rather
     * than one generic method taking a class-string) because the two
     * models have different FK columns to lock/join against, and a
     * single overloaded method would need runtime branching for exactly
     * the same effect.
     */
    public function advanceCertificateItem(RequestCertificate $item, int $targetStatusId): RequestCertificate
    {
        return DB::transaction(function () use ($item, $targetStatusId) {
            /** @var RequestCertificate $item */
            $item = RequestCertificate::lockForUpdate()->findOrFail($item->request_certificate_id);

            $documentRequest = DocumentRequest::lockForUpdate()
                ->findOrFail($item->request_id);

            $this->guardArchived($documentRequest);

            $targetStatus = $this->validateTransition($item->status_id, $targetStatusId);
            $this->guardCertificateGenerated($item, $targetStatus);
            $this->authorizeItemStatusChange($targetStatus);

            $oldStatusId = $item->status_id;
            $item->update(['status_id' => $targetStatus->value]);

            $this->recordItemHistory($documentRequest, $oldStatusId, $targetStatus->value, requestCertificateId: $item->request_certificate_id);

            $this->recomputeAggregateStatus($documentRequest);

            $this->flushAnalyticsCache();

            return $item->refresh();
        });
    }

    // -------------------------------------------------------------------------
    // Internal helpers
    // -------------------------------------------------------------------------

    private function guardArchived(DocumentRequest $documentRequest): void
    {
        // Same rule as DocumentRequestService::updateRequest() — archived
        // requests are read-only everywhere, including one line item at
        // a time. Restoring must go through DocumentRequestService::
        // restoreRequest() first.
        if ($documentRequest->is_archived) {
            abort(422, 'This request is archived and is read-only. Restore it first.');
        }
    }

    /**
     * Mirrors the "certificate must be generated before ReadyToClaim"
     * guard DocumentRequestService::updateRequest() applies at the
     * whole-request level — added here for parity, since without it the
     * per-item "Mark Ready to Claim" button could bypass a check the
     * whole-request button enforces.
     *
     * IMPORTANT, flagged rather than silently carried over: this check
     * is currently a no-op on BOTH paths. certificate_type_id is a
     * non-nullable column set at request creation (see
     * DocumentRequestService::createRequest()) — it is never null by
     * the time staff can act on the item, so whereNotNull()/the
     * equivalent single-row check here can never actually block
     * anything. The real "has this certificate been printed/generated"
     * state that the UI implies exists (printedCertificateIds in
     * useStaffDashboard.js) lives ONLY in browser localStorage — it is
     * never sent to the server, never persisted, and doesn't sync
     * across staff devices or survive a cleared cache. There is no
     * genuine server-side print/generation gate today, on either path.
     *
     * This method is written to be the single place that check lives
     * once a real signal exists — if a generated_at (or similar)
     * column is added to request_certificate and set by an actual
     * print/generate action, swap the condition below for that column
     * and both this method and the whole-request check in
     * DocumentRequestService should be updated together so they can't
     * drift out of parity again.
     */
    private function guardCertificateGenerated(RequestCertificate $item, RequestStatusEnum $targetStatus): void
    {
        if ($targetStatus !== RequestStatusEnum::ReadyToClaim) {
            return;
        }

        if ($item->certificate_type_id === null) {
            abort(422, 'Certificate must be generated before marking as Ready to Claim.');
        }
    }

    private function validateTransition(?int $currentStatusId, int $targetStatusId): RequestStatusEnum
    {
        // A NULL item status shouldn't be reachable in practice (the
        // migration backfills every existing row, and creation always
        // sets an initial status — see DocumentRequestService::
        // createRequest()), but if it's ever hit, treat it the same way
        // Processing behaves as a safe default rather than throwing an
        // opaque enum error.
        $currentStatus = RequestStatusEnum::from($currentStatusId ?? RequestStatusEnum::Processing->value);
        $targetStatus  = RequestStatusEnum::from($targetStatusId);

        if (!in_array($targetStatus, $currentStatus->allowedTransitions(), true)) {
            abort(422, "Transition from {$currentStatus->name} to {$targetStatus->name} is not allowed.");
        }

        return $targetStatus;
    }

    /**
     * Same fine-grained dashboard-action gate DocumentRequestService::
     * authorizeStatusChange() applies at the request level, reused
     * as-is for a single item's target status. See that method's
     * docblock for the full reasoning (Work Item #1 — Granular
     * Per-Action Permissions) — duplicated here rather than extracted
     * into a shared trait/base class, since the two callers take
     * different inputs ($validated array vs. a bare target status) and
     * a premature shared abstraction over two call sites isn't worth
     * the indirection yet.
     */
    private function authorizeItemStatusChange(RequestStatusEnum $targetStatus): void
    {
        $actor = Auth::user();

        if (!$actor instanceof SystemUser) {
            return;
        }

        $requiredAction = match ($targetStatus) {
            RequestStatusEnum::Completed => 'Complete',
            default                       => 'Process',
        };

        if (!$actor->hasModuleAccess('dashboard', $requiredAction)) {
            abort(403, "Your account's assigned policy does not grant the '{$requiredAction}' action on the dashboard module.");
        }
    }

    /**
     * Writes the per-item history row (request_document_id or
     * request_certificate_id set, never both — see migration
     * 2026_08_29_000007's docblock). Uses the same minutes_processed /
     * business_minutes calculation as DocumentRequestService::
     * recordStatusHistory(), scoped to THIS item's own history rows
     * rather than the whole request's, so an item's SLA segment timing
     * reflects only its own prior transitions.
     */
    private function recordItemHistory(
        DocumentRequest $documentRequest,
        ?int $oldStatusId,
        int $newStatusId,
        ?int $requestDocumentId = null,
        ?int $requestCertificateId = null,
    ): void {
        $minutesProcessed = (int) $documentRequest->requested_at->diffInMinutes(now());

        $segmentStart = RequestHistory::where('request_id', $documentRequest->request_id)
            ->when($requestDocumentId, fn ($q) => $q->where('request_document_id', $requestDocumentId))
            ->when($requestCertificateId, fn ($q) => $q->where('request_certificate_id', $requestCertificateId))
            ->orderByDesc('changed_at')
            ->orderByDesc('request_history_id')
            ->value('changed_at');

        $segmentStart = $segmentStart
            ? \Illuminate\Support\Carbon::parse($segmentStart)
            : $documentRequest->requested_at;

        $businessMinutes = $this->businessCalendarService->minutesBetween($segmentStart, now());

        RequestHistory::create([
            'request_id'             => $documentRequest->request_id,
            'request_document_id'    => $requestDocumentId,
            'request_certificate_id' => $requestCertificateId,
            'old_status_id'          => $oldStatusId,
            'new_status_id'          => $newStatusId,
            'changed_at'             => now(),
            'changed_by'             => Auth::id(),
            'minutes_processed'      => $minutesProcessed,
            'business_minutes'       => $businessMinutes,
        ]);
    }

    /**
     * Recomputes document_request.status_id as the "earliest-stage-wins"
     * aggregate of all its line items' statuses, and — only if that
     * changes the request's own status — writes a whole-request history
     * row (request_document_id/request_certificate_id both null, same
     * shape as every existing request-level transition) and notifies the
     * owner, exactly as DocumentRequestService::updateRequest() already
     * does for a direct request-level change. This keeps the two paths
     * indistinguishable from the student's point of view: they see the
     * same status field change and get the same notification either way,
     * regardless of whether it was caused by one item finishing or by a
     * whole-request update.
     *
     * A request with zero items (should not occur — store() always
     * creates at least one) is left untouched rather than guessed at.
     */
    private function recomputeAggregateStatus(DocumentRequest $documentRequest): void
    {
        $itemStatusIds = DB::table('request_document')
            ->where('request_id', $documentRequest->request_id)
            ->whereNotNull('status_id')
            ->pluck('status_id')
            ->merge(
                DB::table('request_certificate')
                    ->where('request_id', $documentRequest->request_id)
                    ->whereNotNull('status_id')
                    ->pluck('status_id')
            );

        if ($itemStatusIds->isEmpty()) {
            return;
        }

        $leastAdvancedStatusId = $itemStatusIds
            ->sortBy(fn (int $statusId) => self::STAGE_RANK[$statusId] ?? PHP_INT_MAX)
            ->first();

        if ((int) $leastAdvancedStatusId === (int) $documentRequest->status_id) {
            return;
        }

        $oldStatusId = $documentRequest->status_id;

        $documentRequest->update(['status_id' => $leastAdvancedStatusId]);

        $this->recordItemHistory($documentRequest, $oldStatusId, $leastAdvancedStatusId);
        $this->notifyOwnerOfStatusChange($documentRequest);
    }

    /**
     * Identical to DocumentRequestService::notifyOwnerOfStatusChange() —
     * duplicated rather than shared for the same reason
     * authorizeItemStatusChange() is: no third caller yet to justify
     * extracting a shared trait, and the two services are intentionally
     * decoupled (this one does not depend on DocumentRequestService, to
     * avoid a circular/awkward dependency now that DocumentRequestService
     * doesn't need to know about item-level status at all).
     */
    private function notifyOwnerOfStatusChange(DocumentRequest $documentRequest): void
    {
        $owner = SystemUser::find($documentRequest->user_id);
        if (!$owner) return;

        $status  = RequestStatusEnum::from((int) $documentRequest->status_id);
        $trigger = $status->notificationTrigger();

        if ($trigger) {
            $data = ['request_id' => $documentRequest->request_id];

            if ($status === RequestStatusEnum::ReadyToClaim) {
                $data['uuid']       = $documentRequest->uuid;
                $data['claim_code'] = $documentRequest->claim_code;
            }

            $this->notificationService->send(
                recipient:    $owner,
                triggerEvent: $trigger,
                data:         $data,
                requestId:    $documentRequest->request_id,
            );
        }
    }
}