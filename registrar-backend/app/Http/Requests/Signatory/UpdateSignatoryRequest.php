<?php

namespace App\Http\Requests\Signatory;

use Illuminate\Foundation\Http\FormRequest;

class UpdateSignatoryRequest extends FormRequest
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
            'name'       => 'sometimes|required|string|max:255',
            'position'   => 'sometimes|required|string|max:255',
            'sort_order' => 'sometimes|nullable|integer',
        ];
    }
}
