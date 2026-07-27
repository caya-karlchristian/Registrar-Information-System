<?php

namespace App\Http\Requests\CertificationType;

use Illuminate\Foundation\Http\FormRequest;

class ArchiveCertificationTypeRequest extends FormRequest
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
            'reason' => 'nullable|string|max:500',
        ];
    }
}
