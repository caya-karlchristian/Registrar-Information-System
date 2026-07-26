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
    // Target must actually be an admin/super-admin account —
    // this endpoint is not for looking up students/alumni.
    // -------------------------------------------------------
    public function view(SystemUser $user, SystemUser $target): bool
    {
        return $user->role_id === SystemUser::ROLE_SUPER_ADMIN
            && in_array($target->role_id, self::MANAGEABLE_ROLES);
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
    // -------------------------------------------------------
    public function update(SystemUser $user, SystemUser $target): bool
    {
        return $user->role_id === SystemUser::ROLE_SUPER_ADMIN
            && in_array($target->role_id, self::MANAGEABLE_ROLES);
    }

    // -------------------------------------------------------
    // PATCH /system-users/{id}/policy
    // Custom ability name — used via $this->authorize('attachPolicy', $target)
    // -------------------------------------------------------
    public function attachPolicy(SystemUser $user, SystemUser $target): bool
    {
        return $user->role_id === SystemUser::ROLE_SUPER_ADMIN
            && in_array($target->role_id, self::MANAGEABLE_ROLES);
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
    // -------------------------------------------------------
    public function delete(SystemUser $user, SystemUser $target): bool
    {
        return $user->role_id === SystemUser::ROLE_SUPER_ADMIN
            && in_array($target->role_id, self::MANAGEABLE_ROLES);
    }
}
