<?php

namespace App\Http\Requests\RequestItem;

use Illuminate\Foundation\Http\FormRequest;

/**
 * PUT /document-requests/{documentRequest}/documents/{requestDocument}
 *
 * Coarse gate only — same shape as UpdateDocumentRequestRequest::
 * authorize(): "is this actor staff with SOME dashboard write action at
 * all". The fine-grained "Process vs Complete, based on the actual target
 * status" check happens in RequestItemStatusService::
 * authorizeItemStatusChange(), which is the only place that knows the
 * target status_id at the point the check needs to run — identical
 * division of responsibility to DocumentRequestPolicy::update() /
 * DocumentRequestService::authorizeStatusChange().
 *
 * Authorizes against the PARENT document_request (DocumentRequestPolicy::
 * update()), not against RequestDocument directly — there is no separate
 * policy for line items, since "can this actor touch this request's
 * items" is the same question as "can this actor update this request".
 */
class UpdateRequestDocumentStatusRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('update', $this->route('documentRequest'));
    }

    public function rules(): array
    {
        return [
            'status_id' => 'required|integer|exists:request_status,status_id',
        ];
    }
}
