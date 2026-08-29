<?php

namespace App\Http\Requests\RequestItem;

use Illuminate\Foundation\Http\FormRequest;

/**
 * PUT /document-requests/{documentRequest}/certificates/{requestCertificate}
 *
 * Mirrors UpdateRequestDocumentStatusRequest exactly — see that class's
 * docblock for the authorization split between here (coarse) and
 * RequestItemStatusService::authorizeItemStatusChange() (fine-grained).
 */
class UpdateRequestCertificateStatusRequest extends FormRequest
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
