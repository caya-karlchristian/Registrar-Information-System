<?php

namespace App\Http\Requests\RequestPurpose;

use Illuminate\Foundation\Http\FormRequest;

class StoreRequestPurposeRequest extends FormRequest
{
    public function authorize(): bool
    {
        // Route sits behind the 'role:3' group in routes/api.php — no
        // per-request Policy check needed here.
        return true;
    }

    public function rules(): array
    {
        return [
            'purpose_name' => 'required|string|max:100|unique:request_purpose,purpose_name',
        ];
    }
}
