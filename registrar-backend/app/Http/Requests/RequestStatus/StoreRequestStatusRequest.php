<?php

namespace App\Http\Requests\RequestStatus;

use Illuminate\Foundation\Http\FormRequest;

class StoreRequestStatusRequest extends FormRequest
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
            'status_name' => 'required|string|max:50',
        ];
    }
}
