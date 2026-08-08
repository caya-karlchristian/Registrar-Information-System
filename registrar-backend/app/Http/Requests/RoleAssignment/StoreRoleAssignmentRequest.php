<?php

namespace App\Http\Requests\RoleAssignment;

use App\Models\SystemUser;
use Illuminate\Foundation\Http\FormRequest;

class StoreRoleAssignmentRequest extends FormRequest
{
    public function authorize(): bool
    {
        // Route middleware ('role:4') + RoleAssignmentPolicy::grant()
        // already restrict this to Super Admin — see routes/api.php.
        return true;
    }

    public function rules(): array
    {
        return [
            'user_id'   => 'required|integer|exists:users,user_id',
            'role_id'   => 'required|integer|in:' . implode(',', [
                SystemUser::ROLE_STUDENT,
                SystemUser::ROLE_ALUMNI,
                SystemUser::ROLE_ADMIN,
                SystemUser::ROLE_SUPER_ADMIN,
            ]),
            'policy_id' => 'nullable|integer|exists:policies,policy_id|required_if:role_id,' . SystemUser::ROLE_ADMIN,
            // Deliberately no default applied server-side (see
            // RoleAssignmentService::grant() docblock) — null is a valid,
            // explicit choice for "indefinite," but the caller has to
            // send it, not omit it by accident. 'sometimes' + nullable
            // lets the request omit the key OR send null; the service
            // treats both the same way.
            'expires_at' => 'sometimes|nullable|date|after:now',
        ];
    }

    public function messages(): array
    {
        return [
            'policy_id.required_if' => 'A policy is required when granting the Admin role.',
        ];
    }
}
