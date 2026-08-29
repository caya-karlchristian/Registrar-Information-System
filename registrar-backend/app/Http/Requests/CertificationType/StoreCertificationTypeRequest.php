<?php

namespace App\Http\Requests\CertificationType;

use Illuminate\Foundation\Http\FormRequest;

class StoreCertificationTypeRequest extends FormRequest
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
            'certificate_name'            => 'required|string|max:255',
            'certificate_requirements'    => 'nullable|string',
            'certificate_process_period'  => 'nullable|string|max:100',
            'access_id'                   => 'nullable|integer',
            'logbook_category_id'         => 'nullable|integer|exists:logbook_category,logbook_category_id',
            'requires_source_submission'  => 'nullable|boolean',
        ];
    }
}