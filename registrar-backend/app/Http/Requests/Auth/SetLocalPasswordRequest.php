<?php

namespace App\Http\Requests\Auth;

use App\Models\SystemUser;
use Illuminate\Foundation\Http\FormRequest;

class SetLocalPasswordRequest extends FormRequest
{
    public function authorize(): bool
    {
        // Route is already gated by ['auth:sanctum', 'role:4'] middleware
        // (routes/api.php). This check is defense-in-depth, matching the
        // pattern used elsewhere (e.g. SystemUserPolicy) — cheap to keep
        // and means this class stays correct even if the route
        // middleware is ever refactored.
        //
        // NOTE: unlike SystemUserPolicy's MANAGEABLE_ROLES, this endpoint
        // can target ANY user (student/alumni/admin/super admin) — see
        // the controller docblock ("Set or update the local password for
        // any user") — so there's no target-role restriction to check,
        // only that the actor is a super admin.
        return $this->user()?->role_id === SystemUser::ROLE_SUPER_ADMIN;
    }

    public function rules(): array
    {
        return [
            'user_id'               => 'required|integer|exists:users,user_id',
            'password'              => 'required|string|min:8|confirmed',
            'password_confirmation' => 'required|string',
        ];
    }
}
