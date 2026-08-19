<?php

namespace App\Policies;

use App\Models\RoleAssignment;
use App\Models\SystemUser;

/**
 * Authorization for role_assignments. Granting/revoking a role is
 * Super-Admin-only, full stop — matches AccessRequestPolicy::review()
 * and SystemUserController's role:4 route gate. A person's own held
 * roles (viewOwn) are readable by themselves, so the frontend switcher
 * can list what they're allowed to assume without needing Super Admin
 * access just to see their own entitlements.
 */
class RoleAssignmentPolicy
{
    public function viewAny(SystemUser $user): bool
    {
        return $user->isSuperAdmin();
    }

    public function viewOwn(SystemUser $user): bool
    {
        return true;
    }

    public function grant(SystemUser $user): bool
    {
        return $user->isSuperAdmin();
    }

    public function revoke(SystemUser $user, RoleAssignment $assignment): bool
    {
        return $user->isSuperAdmin();
    }

    /**
     * Work Item #2 — Admin Management Consolidation. Editing the policy
     * on an already-Active grant is authorized the same as granting one
     * in the first place — it's the same "who gets to decide what an
     * admin can do" decision, just applied to an existing row instead of
     * a new one.
     */
    public function editPolicy(SystemUser $user, RoleAssignment $assignment): bool
    {
        return $user->isSuperAdmin();
    }
}