<?php

namespace App\Http\Requests\Signatory;

use Illuminate\Foundation\Http\FormRequest;

class StoreSignatoryRequest extends FormRequest
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
            'name'       => 'required|string|max:255',
            'position'   => 'required|string|max:255',
            'sort_order' => 'nullable|integer',
        ];
    }
}
