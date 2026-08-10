<?php

namespace App\Http\Requests\Policy;

use Illuminate\Foundation\Http\FormRequest;

class StorePolicyRequest extends FormRequest
{
    public function authorize(): bool
    {
        // Route sits behind the superadmin-only (role:4) group in
        // routes/api.php — no per-request Policy check needed here.
        return true;
    }

    public function rules(): array
    {
        return [
            'name'           => 'required|string|max:100|unique:policies,name',
            'permissions'    => 'required|array',
            'permissions.*'  => 'array',
        ];
    }
}
