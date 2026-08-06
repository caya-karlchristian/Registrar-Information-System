<?php

namespace App\Http\Requests\RoleAssignment;

use Illuminate\Foundation\Http\FormRequest;

class RevokeRoleAssignmentRequest extends FormRequest
{
    public function authorize(): bool
    {
        // Route middleware ('role:4') + RoleAssignmentPolicy::revoke()
        // already restrict this to Super Admin — see routes/api.php.
        return true;
    }

    public function rules(): array
    {
        return [
            // Required, not optional — same reasoning as
            // RejectAccessRequestRequest::reason: a revocation needs a
            // reason on the record, not just a timestamp, both for the
            // audit trail and so a future Super Admin reviewing the
            // roster understands why access was pulled.
            'reason' => 'required|string|max:1000',
        ];
    }
}
