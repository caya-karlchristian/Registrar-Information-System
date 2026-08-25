<?php

namespace App\Http\Requests\SystemUser;

use Illuminate\Foundation\Http\FormRequest;

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
            // No password on create — accounts are pre-registered as
            // 'Pending Activation' with no credential of their own. RIS
            // never sets or accepts a password at creation time (see
            // AdminUserService::create()); the only way any admin ever
            // gets a local password is the separate, superadmin-only
            // POST /api/auth/local-password endpoint, restricted to Super
            // Admin break-glass accounts.
            //
            // No status on create either — it is always server-set to
            // 'Pending Activation' and can only be changed afterward via
            // the update endpoint (UpdateSystemUserRequest) or
            // automatically by first SSO login / the
            // provisioning:expire-stale scheduled command.
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

    public function messages(): array
    {
        return [
            // QA bug #2 — "Vague Error Message" on the Add New User form.
            // Laravel's default unique-rule message ("The email has
            // already been taken.") doesn't say what already has it or
            // why that matters here, which reads as a generic/confusing
            // failure to an admin filling out this form. Matches the
            // wording AccessRequestService::store() already uses for the
            // same underlying condition on the Access Request flow, so
            // the two paths that can hit "this email already belongs to
            // a SystemUser" now say the same thing.
            'email.unique' => 'This email is already associated with a SystemUser account.',
        ];
    }
}