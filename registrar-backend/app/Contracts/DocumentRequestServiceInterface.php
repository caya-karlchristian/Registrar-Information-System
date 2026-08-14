<?php

namespace App\Contracts;

use App\Models\DocumentRequest;
use App\Models\SystemUser;

/**
 * Contract for the document-request business logic layer.
 *
 * Bind in AppServiceProvider so callers depend on this interface,
 * not the concrete DocumentRequestService class.
 * This lets you swap the implementation (e.g. for testing) without
 * touching any controller or other service.
 */
interface DocumentRequestServiceInterface
{
    /**
     * Create a new document request for a student or alumni user,
     * attach its document and certificate line-items, and send
     * the relevant notifications.
     */
    public function createRequest(SystemUser $user, array $validated): DocumentRequest;

    /**
     * Update a document request (status, OR number, receipt date).
     * Writes history on status change and notifies the owner.
     */
    public function updateRequest(DocumentRequest $documentRequest, array $validated): DocumentRequest;

    /**
     * Claim a request via QR scan (uuid) or manual entry (claim_code).
     *
     * Looks the request up by whichever credential is supplied, then
     * delegates the actual Completed transition to updateRequest() — so
     * the row lock, archived-is-read-only guard, and allowedTransitions()
     * check all apply exactly as they do for a manual admin status change.
     *
     * @throws \Illuminate\Http\Exceptions\HttpResponseException 404 if no
     *         matching request exists; propagates whatever updateRequest()
     *         throws (422) if the request isn't currently ReadyToClaim.
     */
    public function claimRequest(array $credential): DocumentRequest;

    /**
     * Archive a single request. Reversible — does not touch status_id.
     * Any authorized admin may archive a request regardless of its
     * current status (see Archive Eligibility Policy – Administrator).
     */
    public function archiveRequest(DocumentRequest $documentRequest, SystemUser $actor): DocumentRequest;

    /**
     * Restore a single archived request. Its status_id is left exactly
     * as it was when archived — restoring never changes status.
     */
    public function restoreRequest(DocumentRequest $documentRequest, SystemUser $actor): DocumentRequest;

    /**
     * Archive many requests by id in one call.
     *
     * @param  int[] $requestIds
     * @return array{archived: int[], skipped: int[]} ids actually archived vs. ids
     *         that didn't exist / were already archived
     */
    public function archiveRequests(array $requestIds, SystemUser $actor): array;

    /**
     * Restore many archived requests by id in one call.
     *
     * @param  int[] $requestIds
     * @return array{restored: int[], skipped: int[]}
     */
    public function restoreRequests(array $requestIds, SystemUser $actor): array;
}