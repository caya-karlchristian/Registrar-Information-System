<?php

namespace App\Http\Requests\SystemUser;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rules\Password;

class UpdateSystemUserRequest extends FormRequest
{
    public function authorize(): bool
    {
        // Kept in the controller instead of here: the controller needs to
        // look the target user up by {id} first (404 if missing) before it
        // can check the role/self-delete rules via SystemUserPolicy, and
        // that ordering (404 before 403) is preserved from the original code.
        return true;
    }

    public function rules(): array
    {
        // apiResource('system-users', ...) names its implicit route
        // parameter 'system_user' (singular of the URI segment), not
        // 'id' — the controller's $id argument still binds fine since
        // Laravel matches scalar controller args positionally, but
        // $this->route() here looks up by name, so 'id' always misses
        // and returns null. That made the unique rule's "except" id
        // silently empty, so the self-update-with-same-email case never
        // got excluded and failed validation.
        $userId = $this->route('system_user');

        return [
            'email'       => 'sometimes|email|unique:users,email,' . $userId . ',user_id',
            'password'    => ['sometimes', Password::min(8)->mixedCase()->numbers()],
            'role_id'     => 'sometimes|integer|in:3,4',
            // Pending Activation / Expired are included so a Super Admin can
            // manually correct a record — e.g. re-open an Expired invite
            // back to Pending Activation, or hand-activate someone whose
            // IdP login isn't matching for some reason — without having to
            // delete and recreate the account.
            'status'      => 'sometimes|in:Activated,Deactivated,Pending Activation,Expired',
            'first_name'  => 'sometimes|string|max:100',
            'middle_name' => 'nullable|string|max:100',
            'last_name'   => 'sometimes|string|max:100',
            'suffix'      => 'nullable|string|max:20',
        ];
    }
}