<?php

namespace App\Http\Requests\Auth;

use App\Models\SystemUser;
use Illuminate\Foundation\Http\FormRequest;

class SwitchRoleRequest extends FormRequest
{
    public function authorize(): bool
    {
        // Caller-only by construction: RoleAssignmentService::switchTo()
        // only ever looks up assignments belonging to $request->user(),
        // so there's no target user_id here for someone to tamper with —
        // the identity comes entirely from the authenticated session.
        return true;
    }

    public function rules(): array
    {
        return [
            'role_id' => 'required|integer|in:' . implode(',', [
                SystemUser::ROLE_STUDENT,
                SystemUser::ROLE_ALUMNI,
                SystemUser::ROLE_ADMIN,
                SystemUser::ROLE_SUPER_ADMIN,
            ]),
        ];
    }
}
