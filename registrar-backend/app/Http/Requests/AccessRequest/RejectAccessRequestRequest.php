<?php

namespace App\Http\Requests\AccessRequest;

use Illuminate\Foundation\Http\FormRequest;

class RejectAccessRequestRequest extends FormRequest
{
    public function authorize(): bool
    {
        // Route middleware ('role:4') already restricts this to Super
        // Admin — see routes/api.php.
        return true;
    }

    public function rules(): array
    {
        return [
            'reason' => 'required|string|max:1000',
        ];
    }
}
