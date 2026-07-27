<?php

namespace App\Http\Requests\CertificationType;

use Illuminate\Foundation\Http\FormRequest;

class UploadCertificationLayoutLogoRequest extends FormRequest
{
    public function authorize(): bool
    {
        // Route already sits behind the 'role:3' middleware group in
        // routes/api.php — no per-request Policy check needed here.
        // The "is this cert archived / template locked" check stays in
        // the controller, same reasoning as UpdateCertificationLayoutRequest.
        return true;
    }

    public function rules(): array
    {
        return [
            'logo' => 'required|image|mimes:jpeg,png,jpg,svg|max:2048',
            'slot' => 'nullable|in:header_left,header_right,footer',
        ];
    }
}
