<?php

namespace App\Http\Requests\RequestDocument;

use Illuminate\Foundation\Http\FormRequest;

class UpdateRequestDocumentRequest extends FormRequest
{
    public function authorize(): bool
    {
        // Route sits behind the 'role:3' middleware in routes/api.php — no
        // per-request Policy check needed here.
        return true;
    }

    public function rules(): array
    {
        return [
            'document_type_id' => 'sometimes|integer|exists:document_type,document_type_id',
            'number_of_copies' => 'sometimes|integer|min:1|max:10',
        ];
    }
}
