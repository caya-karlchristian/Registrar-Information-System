<?php

namespace App\Http\Requests\RoleAssignment;

use Illuminate\Foundation\Http\FormRequest;

class SearchGrantableUsersRequest extends FormRequest
{
    public function authorize(): bool
    {
        // Route middleware ('role:4') + RoleAssignmentPolicy::grant()
        // (checked explicitly in the controller) already restrict this
        // to Super Admin — same pattern as StoreRoleAssignmentRequest.
        return true;
    }

    public function rules(): array
    {
        return [
            // min:2 is a deliberate floor, not cosmetic — a 1-character
            // prefix search ("a", "j") would match a large fraction of
            // any real name column and defeats the point of narrowing
            // via an index. Forces the client to wait for a meaningful
            // prefix before hitting the DB at all.
            'q' => 'required|string|min:2|max:100',
        ];
    }
}
