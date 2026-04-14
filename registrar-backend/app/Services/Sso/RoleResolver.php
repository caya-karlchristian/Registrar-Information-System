<?php

namespace App\Services\Sso;

use App\Models\SystemUser;

class RoleResolver
{
    public function resolve(?SystemUser $existingUser): ?int
    {
        return $existingUser?->role_id;
    }

    public function shouldUpdateRole(SystemUser $user, int $incomingRoleId): bool
    {
        return false; // DB is always source of truth, never overwrite from IDP
    }
}
