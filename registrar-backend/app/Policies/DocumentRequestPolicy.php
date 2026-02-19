<?php

namespace App\Policies;

use App\Models\DocumentRequest;
use App\Models\SystemUser;

class DocumentRequestPolicy
{
    // Who can list requests
    public function viewAny(SystemUser $user)
    {
        return in_array($user->role_id, [1,2,3]);
    }

    // Who can view specific request
    public function view(SystemUser $user, DocumentRequest $request)
    {
        // Registrar can view all
        if ($user->role_id == 3) {
            return true;
        }

        // Student or Alumni can only view their own
        return $request->user_id == $user->user_id;
    }

    // Who can create
    public function create(SystemUser $user)
    {
        return in_array($user->role_id, [1,2]); // student & alumni
    }

    // Who can update
    public function update(SystemUser $user, DocumentRequest $request)
    {
        // Registrar can update anything
        if ($user->role_id == 3) {
            return true;
        }

        // Student/Alumni can update their own only
        return $request->user_id == $user->user_id;
    }

    // Who can delete
    public function delete(SystemUser $user, DocumentRequest $request)
    {
        // Only registrar can delete
        return $user->role_id == 3;
    }
}
