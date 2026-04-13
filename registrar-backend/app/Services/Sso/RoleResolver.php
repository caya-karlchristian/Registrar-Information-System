<?php

namespace App\Services\Sso;

use App\Models\SystemUser;

class RoleResolver
{
    // Maps IdP role strings to the coarse RIS role
    private const IDP_ROLE_PRIORITY = [
        'Admin'   => 3,
        'Student' => 2,
        'Guest'   => 1,
    ];

    // Admin-family roles where DB is the source of truth, not IdP
    private const ADMIN_ROLES = [
        SystemUser::ROLE_ADMIN,
        SystemUser::ROLE_SUPER_ADMIN,
    ];

    public function resolve(array $idpRoles, ?SystemUser $existingUser): ?int
    {
        $coarseRole = $this->resolveCoarseRole($idpRoles);

        if ($coarseRole === null) {
            return null;
        }

        // For admin-family: DB is source of truth for fine-grained distinction
        if ($coarseRole === SystemUser::ROLE_ADMIN) {
            return $this->resolveAdminRole($existingUser);
        }

        // For guest: if user already exists, preserve their DB role (alumni type already set)
        if ($coarseRole === SystemUser::ROLE_ALUMNI && $existingUser) {
            return $existingUser->role_id;
        }

        return $coarseRole;
    }

    public function shouldUpdateRole(SystemUser $user, int $incomingRoleId): bool
    {
        // Never overwrite a DB-managed admin role based on IdP signal alone
        if (in_array($user->role_id, self::ADMIN_ROLES)) {
            return false;
        }

        return $user->role_id !== $incomingRoleId;
    }

    private function resolveCoarseRole(array $idpRoles): ?int
    {
        $resolved = null;
        $highest  = 0;

        foreach ($idpRoles as $role) {
            $level = self::IDP_ROLE_PRIORITY[$role] ?? 0;
            if ($level > $highest) {
                $highest  = $level;
                $resolved = $this->coarseMap($role);
            }
        }

        return $resolved;
    }

    private function resolveAdminRole(?SystemUser $existingUser): int
    {
        if ($existingUser && in_array($existingUser->role_id, self::ADMIN_ROLES)) {
            return $existingUser->role_id;
        }

        // New admin not yet in DB → default to regular admin
        return SystemUser::ROLE_ADMIN;
    }

    private function coarseMap(string $idpRole): ?int
    {
        return match ($idpRole) {
            'Admin'   => SystemUser::ROLE_ADMIN,
            'Student' => SystemUser::ROLE_STUDENT,
            'Guest'   => SystemUser::ROLE_ALUMNI,
            default   => null,
        };
    }
}