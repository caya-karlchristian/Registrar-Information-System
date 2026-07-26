<?php

namespace App\Http\Requests\SystemUser;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rules\Password;

class StoreSystemUserRequest extends FormRequest
{
    public function authorize(): bool
    {
        // Route is already gated by 'role:4' middleware. The controller
        // still calls $this->authorize('create', SystemUser::class)
        // explicitly (via SystemUserPolicy) for defense-in-depth and to
        // match the existing DocumentRequestController pattern — kept
        // there rather than here since store() doesn't need a route
        // parameter to check, but update()/destroy() below do, and they
        // need the 404-before-403 ordering the controller already has.
        return true;
    }

    public function rules(): array
    {
        return [
            'email'       => 'required|email|unique:users,email',
            'password'    => ['required', Password::min(8)->mixedCase()->numbers()],
            'role_id'     => 'required|integer|in:3,4',
            'first_name'  => 'required|string|max:100',
            'middle_name' => 'nullable|string|max:100',
            'last_name'   => 'required|string|max:100',
            'suffix'      => 'nullable|string|max:20',
            // Optional — lets "Add Admin" attach a policy in the same step
            // instead of requiring a separate "Manage Access" action.
            // Only meaningful when role_id = 3 (admin); ignored otherwise.
            'policy_id'   => 'nullable|integer|exists:policies,policy_id',
        ];
    }
}
