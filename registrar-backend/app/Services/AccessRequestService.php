<?php

namespace App\Services;

use App\Contracts\NotificationServiceInterface;
use App\Models\AccessRequest;
use App\Models\AuditLog;
use App\Models\SystemUser;
use App\Services\Concerns\FlushesAnalyticsCache;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Self-service access requests: delegated intake, centralized approval.
 *
 * Any admin with the 'access_requests' module can submit a request
 * (store()) — they can never create a SystemUser directly through this
 * path. Only a Super Admin can approve or reject one (approve()/reject()),
 * and approval funnels through the exact same pre-register-then-link
 * creation AdminUserService::create() performs directly — same
 * 'Pending Activation' status, no IdP call, no password — so there is
 * only ever one code path that actually creates a SystemUser row.
 */
class AccessRequestService
{
    use FlushesAnalyticsCache;

    public function __construct(
        private AdminUserService           $adminUserService,
        private AuditLogger                $auditLogger,
        private NotificationServiceInterface $notificationService,
    ) {}

    /**
     * @throws ValidationException
     */
    public function store(array $validated, Request $request): AccessRequest
    {
        if (SystemUser::where('email', $validated['target_email'])->exists()) {
            throw ValidationException::withMessages([
                'target_email' => 'This email is already associated with a SystemUser account.',
            ]);
        }

        $accessRequest = AccessRequest::create([
            'requested_by'         => $request->user()->user_id,
            'target_email'         => $validated['target_email'],
            'target_first_name'    => $validated['target_first_name'],
            'target_middle_name'   => $validated['target_middle_name'] ?? null,
            'target_last_name'     => $validated['target_last_name'],
            'target_suffix'        => $validated['target_suffix'] ?? null,
            'requested_role_id'    => $validated['requested_role_id'],
            'requested_policy_id'  => $validated['requested_policy_id'] ?? null,
            'justification'        => $validated['justification'],
            'status'               => AccessRequest::STATUS_REQUESTED,
            'expires_at'           => now()->addDays(7),
        ]);

        // QA bugs #4/#9/#14 — a new request changes the Access Request
        // Throughput panel's pending/requested count, so the 10-minute
        // "analytics" cache must be invalidated here too, not just on
        // the document-request side (DocumentRequestService already did
        // this for RIS-PROCESS-BUGS #9; access requests had the same
        // gap). See Concerns\FlushesAnalyticsCache for the full
        // reasoning. Not wrapped in a transaction here — the create()
        // above is already a single, durably-committed insert by the
        // time execution reaches this line.
        $this->flushAnalyticsCache();

        $this->auditLogger->log($request, $request->user(), AuditLog::ACTION_ACCESS_REQUEST_SUBMITTED, [
            'target_email'      => $accessRequest->target_email,
            'access_request_id' => $accessRequest->id,
        ]);

        // Notify every Super Admin — they're the only ones who can review
        // this (see AccessRequestPolicy). requestId stays null: Notification
        // ::request_id is FK'd to document_requests, not access_requests, so
        // the access request's own id travels in `data` instead, same as the
        // audit log above.
        $this->notificationService->sendToSuperAdmins(
            triggerEvent: 'access_request_submitted',
            data: [
                'target_email'      => $accessRequest->target_email,
                'access_request_id' => $accessRequest->id,
            ],
        );

        return $accessRequest;
    }

    /**
     * Approve a pending request: create the SystemUser (same
     * pre-registration path as a direct create) and mark the request
     * Fulfilled — atomically, so a failure partway through never leaves
     * a Fulfilled request with no linked user, or an orphaned user with
     * no linked request.
     *
     * @throws ValidationException
     */
    public function approve(AccessRequest $accessRequest, Request $request): SystemUser
    {
        $this->assertPending($accessRequest);

        $user = DB::transaction(function () use ($accessRequest, $request) {
            $user = $this->adminUserService->create([
                'email'       => $accessRequest->target_email,
                'role_id'     => $accessRequest->requested_role_id,
                'first_name'  => $accessRequest->target_first_name,
                'middle_name' => $accessRequest->target_middle_name,
                'last_name'   => $accessRequest->target_last_name,
                'suffix'      => $accessRequest->target_suffix,
                'policy_id'   => $accessRequest->requested_policy_id,
            ], $request);

            $accessRequest->update([
                'status'            => AccessRequest::STATUS_FULFILLED,
                'reviewed_by'       => $request->user()->user_id,
                'reviewed_at'       => now(),
                'fulfilled_user_id' => $user->user_id,
                'expires_at'        => null,
            ]);

            $this->auditLogger->log($request, $request->user(), AuditLog::ACTION_ACCESS_REQUEST_APPROVED, [
                'target_email'      => $accessRequest->target_email,
                'access_request_id' => $accessRequest->id,
                'fulfilled_user_id' => $user->user_id,
            ]);

            return $user;
        });

        // QA bugs #4/#9/#14 — run AFTER the transaction has committed,
        // never inside it, so a Redis hiccup can't roll back an
        // otherwise-successful approval and a transaction that later
        // rolls back never triggers a needless flush. Same placement
        // rule DocumentRequestService::updateRequest() already follows.
        $this->flushAnalyticsCache();

        return $user;
    }

    /**
     * @throws ValidationException
     */
    public function reject(AccessRequest $accessRequest, string $reason, Request $request): AccessRequest
    {
        $this->assertPending($accessRequest);

        $accessRequest->update([
            'status'            => AccessRequest::STATUS_REJECTED,
            'reviewed_by'       => $request->user()->user_id,
            'reviewed_at'       => now(),
            'rejection_reason'  => $reason,
            'expires_at'        => null,
        ]);

        // QA bugs #4/#9/#14 — see store()'s comment above for why this
        // is needed here too.
        $this->flushAnalyticsCache();

        $this->auditLogger->log($request, $request->user(), AuditLog::ACTION_ACCESS_REQUEST_REJECTED, [
            'target_email'      => $accessRequest->target_email,
            'access_request_id' => $accessRequest->id,
            'reason'            => $reason,
        ]);

        return $accessRequest;
    }

    /**
     * @throws ValidationException
     */
    private function assertPending(AccessRequest $accessRequest): void
    {
        if ($accessRequest->status !== AccessRequest::STATUS_REQUESTED) {
            throw ValidationException::withMessages([
                'status' => "This request is already '{$accessRequest->status}' and can no longer be reviewed.",
            ]);
        }

        // BUG FIX (QA #11 — "Expired Status Not Auto-Tagged"): the raw
        // status column above only rules out requests already swept to
        // Expired/Approved/etc. provisioning:expire-stale doesn't run
        // until 08:15 daily, so a request whose 7-day expires_at has
        // already passed can still read 'Requested' here for up to
        // ~24h. Check isCurrentlyPending() (time-aware) rather than
        // trusting the sweep already ran, so an expired request can
        // never be approved or rejected in that window.
        if (!$accessRequest->isCurrentlyPending()) {
            throw ValidationException::withMessages([
                'status' => 'This request expired on '
                    . $accessRequest->expires_at->format('M j, Y g:i A')
                    . ' and can no longer be reviewed.',
            ]);
        }
    }
}