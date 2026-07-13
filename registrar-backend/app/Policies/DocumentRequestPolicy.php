<?php

namespace App\Policies;

use App\Models\DocumentRequest;
use App\Models\SystemUser;

class DocumentRequestPolicy
{
    // -------------------------------------------------------
    // List all requests
    // All authenticated roles can access index()
    // (controller filters results by role)
    // -------------------------------------------------------
    public function viewAny(SystemUser $user): bool
    {
        return in_array($user->role_id, [
            SystemUser::ROLE_STUDENT,
            SystemUser::ROLE_ALUMNI,
            SystemUser::ROLE_ADMIN,
            SystemUser::ROLE_SUPER_ADMIN,
        ]);
    }

    // -------------------------------------------------------
    // View a specific request
    // Admin/Super Admin → any request
    // Student/Alumni → only their own
    // -------------------------------------------------------
    public function view(SystemUser $user, DocumentRequest $request): bool
    {
        if ($user->isStaff()) {
            return true;
        }

        return (int) $request->user_id === (int) $user->user_id;
    }

    // -------------------------------------------------------
    // Create a request
    // Only students and alumni can submit document requests
    // -------------------------------------------------------
    public function create(SystemUser $user): bool
    {
        return in_array($user->role_id, [
            SystemUser::ROLE_STUDENT,
            SystemUser::ROLE_ALUMNI,
        ]);
    }

    // -------------------------------------------------------
    // Update a request
    // Only admin/super admin can update requests.
    // Students cannot edit their own submitted requests —
    // once submitted, it enters the registrar's workflow.
    // -------------------------------------------------------
    public function update(SystemUser $user, DocumentRequest $request): bool
    {
        return $user->isStaff();
    }

    // -------------------------------------------------------
    // Delete a request
    // Only admin/super admin can delete requests
    // -------------------------------------------------------
    public function delete(SystemUser $user, DocumentRequest $request): bool
    {
        return $user->isStaff();
    }

    // -------------------------------------------------------
    // Archive / restore a request
    // Per the Archive Eligibility Policy – Administrator, any
    // authorized admin/super admin may archive or restore a request
    // regardless of its current status.
    // -------------------------------------------------------
    public function archive(SystemUser $user, DocumentRequest $request): bool
    {
        return $user->isStaff();
    }

    public function restore(SystemUser $user, DocumentRequest $request): bool
    {
        return $user->isStaff();
    }
}