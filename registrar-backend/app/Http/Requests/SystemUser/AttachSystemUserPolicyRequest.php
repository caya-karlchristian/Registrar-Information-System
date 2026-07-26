<?php

namespace App\Http\Requests\SystemUser;

use Illuminate\Foundation\Http\FormRequest;

class AttachSystemUserPolicyRequest extends FormRequest
{
    public function authorize(): bool
    {
        // See UpdateSystemUserRequest — auth stays in the controller so the
        // 404 (user not found) check runs before the 403 (role) check.
        return true;
    }

    public function rules(): array
    {
        return [
            'policy_id' => 'nullable|integer|exists:policies,policy_id',
        ];
    }
}
