<?php

namespace App\Services;

use App\Enums\RequestStatusEnum;
use App\Models\DocumentRequest;
use App\Models\RequestHistory;
use App\Models\SystemUser;
use App\Contracts\DocumentRequestServiceInterface;
use App\Contracts\NotificationServiceInterface;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * Encapsulates all business logic for document requests.
 *
 * Controllers become thin HTTP adapters — they validate input,
 * call this service, and return JSON.
 */
class DocumentRequestService implements DocumentRequestServiceInterface
{
    public function __construct(
        private NotificationServiceInterface $notificationService,
        private BusinessCalendarService $businessCalendarService,
    ) {}

    // -------------------------------------------------------------------------
    // Create
    // -------------------------------------------------------------------------

    /**
     * Create a new document request for a student or alumni user.
     *
     * @throws \Illuminate\Http\Exceptions\HttpResponseException
     */
    public function createRequest(SystemUser $user, array $validated): DocumentRequest
    {
        $requestData = $this->buildRequestData($user, $validated);

        $documentRequest = DocumentRequest::create($requestData);

        foreach ($validated['documents'] ?? [] as $doc) {
            $documentRequest->documents()->create([
                'document_type_id' => $doc['document_type_id'],
                'number_of_copies' => $doc['number_of_copies'],
            ]);
        }

        foreach ($validated['certificates'] ?? [] as $cert) {
            $documentRequest->certificates()->create([
                'certificate_type_id' => $cert['certificate_type_id'],
                'number_of_copies'    => $cert['number_of_copies'] ?? 1,
            ]);
        }

        // ── Build per-item requirements list ─────────────────────────────────
        // Load relations fresh so we always have the latest document/cert data
        // even if the relations were already partially loaded above.
        // Each entry exposes: item name, requirements text, copy count, and the
        // office's stated processing period — everything the student needs to
        // prepare, visible directly inside their inbox notification.
        $documentRequest->load([
            'documents.documentType',
            'certificates.certificationType',
        ]);

        $requirements = [];

        foreach ($documentRequest->documents as $rd) {
            $type = $rd->documentType;
            if ($type) {
                $requirements[] = [
                    'item'         => $type->document_name,
                    'requirements' => $type->document_requirements,
                    'copies'       => $rd->number_of_copies,
                    'process_days' => $type->document_process_period,
                ];
            }
        }

        foreach ($documentRequest->certificates as $rc) {
            $type = $rc->certificationType;
            if ($type) {
                $requirements[] = [
                    'item'         => $type->certificate_name,
                    'requirements' => $type->certificate_requirements,
                    'copies'       => $rc->number_of_copies,
                    'process_days' => $type->certificate_process_period,
                ];
            }
        }

        // Notify the requester and all admins (never superadmins)
        //
        // uuid/claim_code go out here too, not just on the ReadyToClaim
        // transition below — the claim ticket is meant to be available to
        // the student from the moment they submit (same as the pop-up
        // shown immediately after RequestForm.jsx/AlumniRequest.jsx submit),
        // per QR Code Claiming Policy v1.0 §3.2's "pop-up, dashboard, inbox"
        // access points. Staff can only ever *act* on it once the request
        // is actually ReadyToClaim (§3.4, enforced server-side in the claim
        // endpoint) — that's a scan-time restriction, not a visibility one,
        // so there's no reason to withhold the ticket from the inbox until
        // later.
        $this->notificationService->send(
            recipient:    $user,
            triggerEvent: 'request_submitted',
            data:         [
                'request_id'   => $documentRequest->request_id,
                'requirements' => $requirements,   // checklist shown in inbox
                'uuid'         => $documentRequest->uuid,
                'claim_code'   => $documentRequest->claim_code,
            ],
            requestId:    $documentRequest->request_id,
        );

        $this->notificationService->sendToAdmins(
            triggerEvent: 'admin_new_request',
            data:         ['request_id' => $documentRequest->request_id],
            requestId:    $documentRequest->request_id,
        );

        return $documentRequest;
    }

    // -------------------------------------------------------------------------
    // Update
    // -------------------------------------------------------------------------

    /**
     * Update a document request (status, OR number, receipt date).
     * Writes history on status change and notifies the owner.
     * Notifies admins on OR number change (payment verification).
     *
     * Runs inside a DB transaction with a row-level lock so that
     * concurrent admin updates cannot race on the same request.
     */
    public function updateRequest(DocumentRequest $documentRequest, array $validated): DocumentRequest
    {
        // BUG FIX (RIS-PROCESS-BUGS #9 — "Omission of Completed Documents
        // in Staff Performance Analytics"): every analytics endpoint
        // (AnalyticsController) is cached for 10 minutes under the
        // "analytics" cache tag, so a document that just got marked
        // Completed (or moved through any other status) doesn't show up
        // in the Staff Performance / overview / volume charts until that
        // cache entry naturally expires — which reads as "the dashboard
        // omitted it" if you check within that window. $statusChanged is
        // set inside the transaction below and read after it commits, so
        // the flush below only fires once per actual status transition,
        // and only after that transition is durably committed (never for
        // a transaction that later rolls back).
        $statusChanged = false;

        $documentRequest = DB::transaction(function () use ($documentRequest, $validated, &$statusChanged) {
            // Re-fetch with a row-level lock so concurrent admin updates
            // cannot race: the second request will block here until the
            // first transaction commits, then re-read the committed state.
            $documentRequest = DocumentRequest::lockForUpdate()
                ->findOrFail($documentRequest->request_id);

            // Archive Rules: "Archived records cannot be processed, edited,
            // or have their status updated while archived." Restoring must
            // go through restoreRequest() instead — never through this
            // general-purpose update path.
            if ($documentRequest->is_archived) {
                abort(422, 'This request is archived and is read-only. Restore it first.');
            }

            $oldStatusId = $documentRequest->status_id;
            $oldOrNumber = $documentRequest->or_number;

            // Guard: transitioning to ReadyToClaim on a *certificate* request
        // requires that at least one certificate row already exists in
        // request_certificate (i.e. it has been generated/printed).
        //
        // Pure document requests (transcripts, enrollment certs, etc.) have
        // zero rows in request_certificate by design — they must NOT be blocked.
        // Only requests that were submitted WITH certificate items are checked.
        //
            // Flow:
            //   1. Does this request have any certificate items? (hasCertificateItems)
            //   2. If yes, has at least one been generated?     (certCount > 0)
            //   3. If both fail → 422.  Otherwise → allow.
            //
            // Checked on ANY transition INTO ReadyToClaim, not just directly
            // from Processing: since PendingSignature (Step 3) can also
            // reach ReadyToClaim, a certificate request routed through
            // signature-waiting must still have been generated before it's
            // considered claimable.
            if (
                isset($validated['status_id']) &&
                (int) $validated['status_id'] === RequestStatusEnum::ReadyToClaim->value
            ) {
                // Count rows in request_certificate that were submitted as part of
                // this request (created during store(), referencing certificate_type).
                // A non-zero count means the request includes certificate items.
                $submittedCertCount = $documentRequest->certificates()->count();

                // Only enforce the print-first rule when this request actually
                // includes certificate items. Document-only requests skip this guard.
                if ($submittedCertCount > 0) {
                    // All certificate items must have been generated before claiming.
                    // Currently: if the row exists it has been generated (the modal
                    // creates the row). Adjust this condition if a "generated" flag
                    // is added to the model later.
                    $generatedCount = $documentRequest->certificates()
                        ->whereNotNull('certificate_type_id')
                        ->count();

                    if ($generatedCount === 0) {
                        abort(422, 'Certificate must be generated before marking as Ready to Claim.');
                    }
                }
            }

            // Enforce allowed status transitions (see RequestStatusEnum::allowedTransitions).
            $targetStatus = null;
            if (isset($validated['status_id'])) {
                $currentStatus = RequestStatusEnum::from((int) $oldStatusId);
                $targetStatus  = RequestStatusEnum::from((int) $validated['status_id']);
                if (!in_array($targetStatus, $currentStatus->allowedTransitions(), true)) {
                    abort(422, "Transition from {$currentStatus->name} to {$targetStatus->name} is not allowed.");
                }
            }

            // Work Item #1 — Granular Per-Action Permissions: the FINE
            // gate. PUT /document-requests/{id} is one endpoint that
            // handles every status transition, so the coarse route/
            // policy gate above (DocumentRequestPolicy::update()) can
            // only confirm the actor has SOME dashboard write action —
            // it cannot tell "Process" from "Complete" apart, because
            // that depends on the target status_id, which is only known
            // here, after the transition itself has been validated as
            // legal. This is the check that actually stops a Student
            // Staff account (dashboard: [View, Complete]) from setting
            // ReadyToClaim/PendingSignature/Forfeited or editing
            // or_number/receipt_date, even via a direct, manually
            // crafted API call that never touches the UI.
            $this->authorizeStatusChange($validated, $targetStatus);

            $documentRequest->update($validated);

            if (isset($validated['status_id']) && (int) $validated['status_id'] !== (int) $oldStatusId) {
                $this->recordStatusHistory($documentRequest, $oldStatusId);
                $this->notifyOwnerOfStatusChange($documentRequest);
                $statusChanged = true;
            }

            if (
                isset($validated['or_number']) &&
                $documentRequest->or_number !== $oldOrNumber &&
                !empty($documentRequest->or_number)
            ) {
                $this->notificationService->sendToAdmins(
                    triggerEvent: 'admin_payment_verification',
                    data:         ['request_id' => $documentRequest->request_id],
                    requestId:    $documentRequest->request_id,
                );
            }

            return $documentRequest;
        }); // end DB::transaction

        // See BUG FIX comment above updateRequest()'s signature. Runs
        // AFTER the transaction has committed — never inside it, so a
        // Redis hiccup can't roll back an otherwise-successful status
        // change, and so a transaction that ends up rolling back never
        // triggers a needless flush.
        if ($statusChanged) {
            $this->flushAnalyticsCache();
        }

        return $documentRequest;
    }

    /**
     * Invalidates every cached analytics response (AnalyticsController,
     * 10-minute TTL) so a status change is reflected on the next request
     * instead of waiting out the cache window. See updateRequest()'s
     * BUG FIX comment (RIS-PROCESS-BUGS #9) for why this exists.
     *
     * Cache::tags() requires a taggable store (Redis — see
     * AnalyticsController's docblock; it does NOT work with the "file"
     * driver). Guarded with an instanceof check plus a try/catch so a
     * misconfigured or momentarily-unavailable cache backend degrades to
     * "analytics are stale for up to 10 minutes, as before" rather than
     * failing the document-status update itself — the cache is a
     * performance optimization, not a source of truth, so it must never
     * be allowed to break the actual business transaction it's
     * piggybacking on.
     */
    private function flushAnalyticsCache(): void
    {
        try {
            $store = Cache::getStore();

            if ($store instanceof \Illuminate\Cache\TaggableStore) {
                Cache::tags(['analytics'])->flush();
            }
        } catch (\Throwable $e) {
            Log::warning('Failed to flush analytics cache after a document request status change.', [
                'exception' => $e->getMessage(),
            ]);
        }
    }

    // -------------------------------------------------------------------------
    // Claim (QR scan / manual claim_code)
    // -------------------------------------------------------------------------

    /**
     * @param array{uuid?: string, claim_code?: string} $credential exactly
     *        one key set — enforced by ClaimDocumentRequestRequest before
     *        this is ever called.
     */
    public function claimRequest(array $credential): DocumentRequest
    {
        // Plain lookup, no lock here on purpose: updateRequest() below
        // re-fetches by request_id under lockForUpdate() and re-validates
        // everything (archived, transition-allowed) against the committed
        // state at that point. Locking twice on two different query shapes
        // (by uuid/claim_code here, by request_id there) would only add
        // deadlock surface for no extra safety.
        //
        // The default ExcludeArchivedScope applies here same as any other
        // query, so an archived request's code/uuid simply won't match —
        // consistent with archived requests being read-only everywhere else.
        $documentRequest = DocumentRequest::query()
            ->when(isset($credential['uuid']), fn ($q) => $q->where('uuid', $credential['uuid']))
            ->when(isset($credential['claim_code']), fn ($q) => $q->where('claim_code', $credential['claim_code']))
            ->first();

        if (!$documentRequest) {
            // Deliberately generic — doesn't reveal whether a uuid or
            // claim_code was the invalid part of the payload.
            abort(404, 'No matching request found for that code.');
        }

        // Reuses the exact same guarded path a manual admin status change
        // goes through: row lock, "archived is read-only", and
        // allowedTransitions() — which only permits ReadyToClaim →
        // Completed. That means a request that's still Processing, or
        // one that was already Completed by an earlier scan, is rejected
        // here with the same clear 422 updateRequest() already produces,
        // with no extra logic needed to distinguish those cases.
        return $this->updateRequest($documentRequest, [
            'status_id' => RequestStatusEnum::Completed->value,
        ]);
    }

    // -------------------------------------------------------------------------
    // Archive / Restore
    // -------------------------------------------------------------------------
    //
    // Deliberately separate from updateRequest(): archiving never touches
    // status_id, so a restored record comes back with its original status
    // untouched (Archive Rules policy). Any authorized admin may archive a
    // request regardless of its current status_id — there is no eligibility
    // check here, unlike document/certificate type archiving.

    public function archiveRequest(DocumentRequest $documentRequest, SystemUser $actor): DocumentRequest
    {
        return DB::transaction(function () use ($documentRequest, $actor) {
            $documentRequest = DocumentRequest::withArchived()
                ->lockForUpdate()
                ->findOrFail($documentRequest->request_id);

            if (!$documentRequest->is_archived) {
                $documentRequest->update([
                    'is_archived' => true,
                    'archived_on' => now(),
                    'archived_by' => $actor->user_id,
                ]);
            }

            return $documentRequest;
        });
    }

    public function restoreRequest(DocumentRequest $documentRequest, SystemUser $actor): DocumentRequest
    {
        return DB::transaction(function () use ($documentRequest, $actor) {
            $documentRequest = DocumentRequest::withArchived()
                ->lockForUpdate()
                ->findOrFail($documentRequest->request_id);

            // status_id is intentionally left untouched — restoring returns
            // the record to Active Requests with its original status.
            if ($documentRequest->is_archived) {
                $documentRequest->update([
                    'is_archived' => false,
                    'archived_on' => null,
                    'archived_by' => null,
                    'restored_on' => now(),
                    'restored_by' => $actor->user_id,
                ]);
            }

            return $documentRequest;
        });
    }

    public function archiveRequests(array $requestIds, SystemUser $actor): array
    {
        return DB::transaction(function () use ($requestIds, $actor) {
            $eligible = DocumentRequest::withArchived()
                ->whereIn('request_id', $requestIds)
                ->where('is_archived', false)
                ->lockForUpdate()
                ->pluck('request_id')
                ->all();

            if (!empty($eligible)) {
                DocumentRequest::withArchived()
                    ->whereIn('request_id', $eligible)
                    ->update([
                        'is_archived' => true,
                        'archived_on' => now(),
                        'archived_by' => $actor->user_id,
                    ]);
            }

            return [
                'archived' => $eligible,
                'skipped'  => array_values(array_diff($requestIds, $eligible)),
            ];
        });
    }

    public function restoreRequests(array $requestIds, SystemUser $actor): array
    {
        return DB::transaction(function () use ($requestIds, $actor) {
            $eligible = DocumentRequest::withArchived()
                ->whereIn('request_id', $requestIds)
                ->where('is_archived', true)
                ->lockForUpdate()
                ->pluck('request_id')
                ->all();

            if (!empty($eligible)) {
                DocumentRequest::withArchived()
                    ->whereIn('request_id', $eligible)
                    ->update([
                        'is_archived' => false,
                        'archived_on' => null,
                        'archived_by' => null,
                        // Row-level attribution for the restore itself —
                        // mirrors archived_on/archived_by above. The bulk
                        // action is also written to audit_logs by the
                        // controller, but that requires a join to answer
                        // "who restored this request"; these columns let
                        // that be queried directly off the row.
                        'restored_on' => now(),
                        'restored_by' => $actor->user_id,
                    ]);
            }

            return [
                'restored' => $eligible,
                'skipped'  => array_values(array_diff($requestIds, $eligible)),
            ];
        });
    }

    // -------------------------------------------------------------------------
    // Internal helpers
    // -------------------------------------------------------------------------

    /**
     * Build the DB row array based on the user's role.
     *
     * @throws \RuntimeException
     */
    private function buildRequestData(SystemUser $user, array $validated): array
    {
        $base = [
            'user_id'            => $user->user_id,
            'status_id'          => RequestStatusEnum::Processing->value,
            'request_purpose_id' => $validated['request_purpose_id'],
            'or_number'          => $validated['or_number'] ?? null,
            'receipt_date'       => $validated['receipt_date'] ?? null,
        ];

        if ($user->isStudent()) {
            $studentProfile = $user->studentProfile;
            $academicRecord = $user->academicRecord;

            if (!$studentProfile || !$academicRecord) {
                abort(400, 'Student profile or academic record not found.');
            }

            return array_merge($base, [
                'student_profile_id'  => $studentProfile->student_profile_id,
                'student_academic_id' => $academicRecord->student_academic_id,
                'alumni_profile_id'   => null,
                'alumni_academic_id'  => null,
            ]);
        }

        if ($user->isAlumni()) {
            $alumniProfile  = $user->alumniProfile;
            $academicRecord = $alumniProfile?->academicRecord;

            if (!$alumniProfile || !$academicRecord) {
                abort(400, 'Alumni profile or academic record not found.');
            }

            return array_merge($base, [
                'student_profile_id'  => null,
                'student_academic_id' => null,
                'alumni_profile_id'   => $alumniProfile->alumni_profile_id,
                'alumni_academic_id'  => $academicRecord->alumni_academic_id,
            ]);
        }

        abort(403, 'Unauthorized role.');
    }

    /**
     * Work Item #1 — Granular Per-Action Permissions: the fine gate for
     * PUT /document-requests/{id}, called from updateRequest() after
     * the transition itself has already been validated as legal.
     *
     * Resolves which dashboard action(s) this specific call actually
     * requires (see requiredDashboardActions()) and aborts with 403 if
     * the acting admin's policy doesn't grant every one of them.
     *
     * Reads the actor off Auth::user() rather than taking a parameter —
     * matches recordStatusHistory()'s existing Auth::id() usage in this
     * same class, and keeps this method callable from claimRequest()'s
     * call into updateRequest() without changing either method's
     * public signature.
     *
     * Deliberately permissive for non-admin/non-SystemUser actors
     * (console commands, the automated shredder's direct DB writes,
     * etc.) — those either bypass this service entirely or are already
     * gated by isStaff()/role middleware upstream. SystemUser::
     * hasModuleAccess() itself already returns true unconditionally for
     * super admins and for any non-admin role, so in practice this only
     * ever restricts an ADMIN whose policy is missing the specific
     * action a given call needs.
     */
    private function authorizeStatusChange(array $validated, ?RequestStatusEnum $targetStatus): void
    {
        $actor = Auth::user();

        if (!$actor instanceof SystemUser) {
            return;
        }

        foreach ($this->requiredDashboardActions($validated, $targetStatus) as $action) {
            if (!$actor->hasModuleAccess('dashboard', $action)) {
                abort(403, "Your account's assigned policy does not grant the '{$action}' action on the dashboard module.");
            }
        }
    }

    /**
     * Which dashboard action(s) this update() call requires, based on
     * what's actually in $validated — per the Work Item #1 spec:
     *
     *   target = Completed                                  -> Complete
     *   target = ReadyToClaim | PendingSignature | Forfeited -> Process
     *   or_number / receipt_date changing (any status)       -> Process
     *
     * Both checks apply independently and accumulate: a single call
     * that both completes the request AND edits or_number requires
     * BOTH 'Complete' and 'Process' — a Student Staff account (which
     * only ever has 'Complete') is correctly blocked from smuggling a
     * metadata edit in alongside a status change it's otherwise allowed
     * to make. A call with no status_id and no or_number/receipt_date
     * change (i.e. nothing this policy gates) requires nothing here.
     *
     * @return array<string> distinct action tokens, possibly empty
     */
    private function requiredDashboardActions(array $validated, ?RequestStatusEnum $targetStatus): array
    {
        $required = [];

        if ($targetStatus !== null) {
            $required[] = match ($targetStatus) {
                RequestStatusEnum::Completed => 'Complete',
                // ReadyToClaim, PendingSignature, Forfeited all require
                // Process. Processing/Cancelled are unreachable at this
                // point (allowedTransitions() already aborted on an
                // illegal transition before this runs) — Process is
                // still the safe default for them since it's the more
                // restrictive of the two dashboard write actions.
                default => 'Process',
            };
        }

        if (array_key_exists('or_number', $validated) || array_key_exists('receipt_date', $validated)) {
            $required[] = 'Process';
        }

        return array_values(array_unique($required));
    }

    private function recordStatusHistory(DocumentRequest $documentRequest, int $oldStatusId): void
    {
        // minutes_processed: kept exactly as before (cumulative raw
        // wall-clock minutes since requested_at) for backward compatibility
        // with existing reports/dashboards that already read this column
        // with that meaning. Do not repurpose it — see the migration
        // 2026_08_15_000000_add_pending_signature_status doc block for why
        // business_minutes exists as a separate column instead.
        $minutesProcessed = (int) $documentRequest->requested_at->diffInMinutes(now());

        // business_minutes: the calendar-aware duration of THIS segment
        // only — i.e. time elapsed since the previous status change (or
        // since requested_at, if this is the request's first transition),
        // counting only minutes inside office hours and skipping
        // weekends/holidays. This is what makes it possible to fairly
        // attribute elapsed time to whoever actually controlled it:
        //   - a Processing → PendingSignature segment measures the
        //     registrar's own turnaround.
        //   - a PendingSignature → ReadyToClaim segment measures the
        //     external signing office's turnaround.
        //   - a Processing → ReadyToClaim segment (no signature needed)
        //     measures the registrar's turnaround, same as before.
        //
        // Currently uses the default business calendar for every segment
        // (BusinessCalendarService falls back to it when no calendar id is
        // given). Per-office calendars are already supported by the
        // service/schema (Step 2) — once individual signing offices are
        // confirmed to keep different hours, look up that office's
        // calendar_id here for PendingSignature → ReadyToClaim segments
        // specifically, rather than changing this method's shape again.
        $segmentStart = RequestHistory::where('request_id', $documentRequest->request_id)
            ->orderByDesc('changed_at')
            ->orderByDesc('request_history_id')
            ->value('changed_at');

        $segmentStart = $segmentStart
            ? \Illuminate\Support\Carbon::parse($segmentStart)
            : $documentRequest->requested_at;

        $businessMinutes = $this->businessCalendarService->minutesBetween($segmentStart, now());

        RequestHistory::create([
            'request_id'        => $documentRequest->request_id,
            'old_status_id'     => $oldStatusId,
            'new_status_id'     => $documentRequest->status_id,
            'changed_at'        => now(),
            'changed_by'        => Auth::id(),
            'minutes_processed' => $minutesProcessed,
            'business_minutes'  => $businessMinutes,
        ]);
    }

    private function notifyOwnerOfStatusChange(DocumentRequest $documentRequest): void
    {
        $owner = SystemUser::find($documentRequest->user_id);
        if (!$owner) return;

        $status = RequestStatusEnum::from((int) $documentRequest->status_id);
        $trigger = $status->notificationTrigger();

        if ($trigger) {
            $data = ['request_id' => $documentRequest->request_id];

            // The ticket already went out on the request_submitted
            // notification above (submitRequest()), so this isn't the only
            // place it's available — but ReadyToClaim is the moment a
            // student is actually being told "go claim this now," so it's
            // worth repeating the ticket on this notification too rather
            // than making them scroll back to find their original one.
            // uuid/claim_code aren't sensitive by themselves (see
            // ClaimTicket.jsx docblock: the QR alone can't complete a claim
            // — staff still verify identity + requirements in person before
            // scanning), so there's no downside to including them again.
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