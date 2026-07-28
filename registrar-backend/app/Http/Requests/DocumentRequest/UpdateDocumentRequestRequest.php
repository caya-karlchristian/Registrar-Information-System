<?php

namespace App\Http\Requests\DocumentRequest;

use Illuminate\Foundation\Http\FormRequest;

class UpdateDocumentRequestRequest extends FormRequest
{
    public function authorize(): bool
    {
        // {documentRequest} is already resolved to a DocumentRequest model
        // by Laravel's implicit route-model binding before this runs
        // (the controller method already type-hints it), so this is safe
        // to check here — unlike SystemUserController, there's no manual
        // findOrFail()/404 step in between to preserve the ordering of.
        return $this->user()->can('update', $this->route('documentRequest'));
    }

    public function rules(): array
    {
        return [
            'status_id'    => 'sometimes|integer|exists:request_status,status_id',
            'or_number'    => 'sometimes|nullable|string|max:50',
            'receipt_date' => 'sometimes|nullable|date',
        ];
    }
}
