<?php

namespace App\Policies;

use App\Models\SystemUser;

/**
 * Authorization for admin/super-admin account management
 * (System Users module — distinct from student/alumni accounts).
 *
 * Mirrors the DocumentRequestPolicy pattern: controllers call
 * $this->authorize(...) instead of inlining role_id checks.
 *
 * NOTE: Laravel resolves this automatically for App\Models\SystemUser
 * via naming convention — no manual registration needed (same as
 * DocumentRequestPolicy already relies on).
 */
class SystemUserPolicy
{
    private const MANAGEABLE_ROLES = [
        SystemUser::ROLE_ADMIN,
        SystemUser::ROLE_SUPER_ADMIN,
    ];

    // -------------------------------------------------------
    // GET /system-users
    // Only super admins manage the admin/super-admin roster.
    // -------------------------------------------------------
    public function viewAny(SystemUser $user): bool
    {
        return $user->role_id === SystemUser::ROLE_SUPER_ADMIN;
    }

    // -------------------------------------------------------
    // GET /system-users/{id}
    //
    // Work Item #3 — Admin Accounts / Student Staff Visibility:
    // SystemUserController::index() now also lists accounts whose
    // PRIMARY role is Student/Alumni but who hold an active Admin-tier
    // role_assignments grant (see isAdministrativelyManageable() below).
    // A row that's visible in that listing must also be viewable through
    // this same policy, or clicking into a newly-listed "student staff"
    // row would 403 the moment it's opened — this endpoint is still not
    // for looking up an ordinary student/alumni with no administrative
    // grant at all.
    // -------------------------------------------------------
    public function view(SystemUser $user, SystemUser $target): bool
    {
        return $user->role_id === SystemUser::ROLE_SUPER_ADMIN
            && $this->isAdministrativelyManageable($target);
    }

    // -------------------------------------------------------
    // POST /system-users
    // -------------------------------------------------------
    public function create(SystemUser $user): bool
    {
        return $user->role_id === SystemUser::ROLE_SUPER_ADMIN;
    }

    // -------------------------------------------------------
    // PUT /system-users/{id}
    //
    // Work Item #3: same reasoning as view() above — a Super Admin must
    // be able to edit identity/Status (the only fields this endpoint
    // still accepts as of Work Item #2) on a student-staff account, since
    // Admin Accounts now lists it. Deactivating such an account through
    // here already correctly cascades to revoke ALL of that user's role
    // assignments, not just the administrative one — see
    // AdminUserService::update().
    // -------------------------------------------------------
    public function update(SystemUser $user, SystemUser $target): bool
    {
        return $user->role_id === SystemUser::ROLE_SUPER_ADMIN
            && $this->isAdministrativelyManageable($target);
    }

    // -------------------------------------------------------
    // DELETE /system-users/{id}
    //
    // NOTE: this intentionally does NOT check for self-delete. The
    // controller checks that separately with its own specific error
    // message ("You cannot delete your own account.") because
    // Laravel's default AuthorizationException response ("This action
    // is unauthorized.") would otherwise replace that message with a
    // generic one — worse UX for a case the frontend specifically
    // surfaces to the user.
    //
    // Work Item #3: deliberately NOT extended to student-staff targets
    // the way view()/update() were. Hard-deleting a system user here
    // deletes the entire account, not just the administrative grant on
    // top of it — for a "student staff" row, that means deleting a real
    // student's whole account from what is meant to be an admin
    // management screen. Revoking their administrative access (Manage
    // Roles) or deactivating the account (Edit User → Status) are the
    // correct tools for that; a straight delete stays scoped to genuine
    // admin/super-admin primary accounts only, same as before.
    // -------------------------------------------------------
    public function delete(SystemUser $user, SystemUser $target): bool
    {
        return $user->role_id === SystemUser::ROLE_SUPER_ADMIN
            && in_array($target->role_id, self::MANAGEABLE_ROLES);
    }

    /**
     * Work Item #3: true if $target either has an Admin-tier PRIMARY
     * role, or currently holds an active Admin-tier role_assignments
     * grant on top of a base Student/Alumni identity — matching
     * SystemUserController::index()'s listing criteria exactly (see its
     * docblock). Queried directly rather than relying on an eager-loaded
     * relation, since $target here is a plain SystemUser::find($id)
     * lookup done by show()/update() — it never has activeRoleAssignments
     * preloaded the way index()'s collection does.
     */
    private function isAdministrativelyManageable(SystemUser $target): bool
    {
        if (in_array($target->role_id, self::MANAGEABLE_ROLES, true)) {
            return true;
        }

        return $target->activeRoleAssignments()
            ->whereIn('role_id', self::MANAGEABLE_ROLES)
            ->exists();
    }
}