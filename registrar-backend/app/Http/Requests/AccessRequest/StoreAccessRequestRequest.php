<?php

namespace App\Http\Requests\AccessRequest;

use App\Models\SystemUser;
use Illuminate\Foundation\Http\FormRequest;

class StoreAccessRequestRequest extends FormRequest
{
    public function authorize(): bool
    {
        // Route middleware (['role:3,4', 'module:access_requests']) already
        // restricts this to admins/super-admins with the module granted —
        // see routes/api.php. No per-request authorization beyond that.
        return true;
    }

    public function rules(): array
    {
        return [
            'target_email'      => 'required|email|max:255',
            'target_first_name' => 'required|string|max:100',
            'target_middle_name' => 'nullable|string|max:100',
            'target_last_name'  => 'required|string|max:100',
            'requested_role_id' => 'required|integer|in:' . SystemUser::ROLE_ADMIN . ',' . SystemUser::ROLE_SUPER_ADMIN,
            'requested_policy_id' => 'nullable|integer|exists:policies,policy_id',
            'justification'     => 'required|string|max:2000',
        ];
    }
}