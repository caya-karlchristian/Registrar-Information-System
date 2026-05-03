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
}
