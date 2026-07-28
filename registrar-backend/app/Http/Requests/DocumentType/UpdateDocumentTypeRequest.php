<?php

namespace App\Http\Requests\DocumentType;

use Illuminate\Foundation\Http\FormRequest;

class UpdateDocumentTypeRequest extends FormRequest
{
    public function authorize(): bool
    {
        // Route already sits behind the 'role:3' middleware group in
        // routes/api.php — no per-request Policy check needed here.
        return true;
    }

    public function rules(): array
    {
        return [
            'document_name'           => 'sometimes|string|max:100',
            'document_description'    => 'nullable|string',
            'document_requirements'   => 'nullable|string',
            'document_process_period' => 'nullable|string|max:100',
            'access_id'               => 'nullable|integer|exists:access_type,access_id',
        ];
    }
}