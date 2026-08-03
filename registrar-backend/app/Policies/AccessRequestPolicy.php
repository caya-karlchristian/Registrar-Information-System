<?php

namespace App\Policies;

use App\Models\AccessRequest;
use App\Models\SystemUser;

/**
 * Authorization for self-service access requests.
 *
 * Submission (create) requires the 'access_requests' module — checked
 * here AND at the route level (['role:3,4', 'module:access_requests'])
 * for defense-in-depth, matching the pattern the rest of the codebase
 * uses. Review (viewAny/approve/reject) is Super Admin only — a request
 * cannot approve itself into existence by anyone but the person
 * ultimately accountable for the roster.
 */
class AccessRequestPolicy
{
    public function viewAny(SystemUser $user): bool
    {
        return $user->isSuperAdmin();
    }

    public function create(SystemUser $user): bool
    {
        return $user->isSuperAdmin() || $user->hasModuleAccess('access_requests');
    }

    public function review(SystemUser $user, AccessRequest $accessRequest): bool
    {
        return $user->isSuperAdmin();
    }
}
