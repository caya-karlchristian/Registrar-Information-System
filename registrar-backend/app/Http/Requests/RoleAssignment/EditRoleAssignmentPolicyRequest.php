<?php

namespace App\Http\Requests\RoleAssignment;

use Illuminate\Foundation\Http\FormRequest;

/**
 * Work Item #2 — Admin Management Consolidation.
 *
 * PATCH /role-assignments/{roleAssignment}/policy — edits the policy on
 * an already-Active Admin role_assignment in place. This is the direct
 * replacement for the old PATCH /system-users/{id}/policy ("Manage
 * Access") endpoint: role_assignments is now the only place a policy is
 * ever written from the UI.
 */
class EditRoleAssignmentPolicyRequest extends FormRequest
{
    public function authorize(): bool
    {
        // Route middleware ('role:4') + RoleAssignmentPolicy::editPolicy()
        // (checked explicitly in the controller, so the 404-before-403
        // ordering matches every other model-bound request in this
        // module) already restrict this to Super Admin.
        return true;
    }

    public function rules(): array
    {
        return [
            // Nullable is intentional — sending null detaches the policy
            // (fail-closed: effectivePermissions() falls back to the
            // system default policy, never to "everything"), same as the
            // retired attachPolicy() endpoint allowed.
            'policy_id' => 'nullable|integer|exists:policies,policy_id',
        ];
    }
}
