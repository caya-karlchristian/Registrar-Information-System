<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use App\Models\SystemUser;

class UserResource extends JsonResource
{
    public function toArray($request): array
    {
        return [
            'user_id'  => $this->user_id,
            'email'    => $this->email,
            'role_id'  => $this->role_id,

            // Human-readable role name so the frontend never needs to
            // hardcode "if role_id === 3" checks — use role_name instead
            'role_name' => $this->resolveRoleName(),

            // Student relations — only present if loaded
            'student_profile' => $this->whenLoaded('studentProfile'),
            'academic_record' => $this->whenLoaded('academicRecord'),

            // Alumni relation — only present if loaded
            // Will return data once alumni module is built
            'alumni_profile'  => $this->whenLoaded('alumniProfile'),

            // Admin/Super Admin relation — only present if loaded
            // Will return data once admin profile module is built
            'admin_profile'   => $this->whenLoaded('adminProfile'),

            // Flattened copies of the same admin_profile fields, so callers
            // (e.g. the account-settings form after a save) can read
            // data.first_name directly instead of reaching into
            // data.admin_profile — only present when adminProfile is loaded.
            'first_name'  => $this->whenLoaded('adminProfile', fn () => $this->adminProfile?->first_name),
            'middle_name' => $this->whenLoaded('adminProfile', fn () => $this->adminProfile?->middle_name),
            'last_name'   => $this->whenLoaded('adminProfile', fn () => $this->adminProfile?->last_name),
            'suffix'      => $this->whenLoaded('adminProfile', fn () => $this->adminProfile?->suffix),

            // Policy attachment — admin-only. Super admins always have
            // full access and never carry a policy_id (see RoleMiddleware).
            'policy_id' => $this->policy_id,
            'policy'    => $this->whenLoaded('policy', fn () => $this->policy ? new PolicyResource($this->policy) : null),

            // The module => actions map that ACTUALLY applies right now
            // (own policy, else the default policy, else nothing) — see
            // SystemUser::effectivePermissions(). This is what the
            // frontend should read to decide what to show/allow; it
            // should never re-derive this from policy_id/policy itself,
            // or the two could drift apart.
            'effective_permissions' => $this->when(
                $this->isAdmin(),
                fn () => $this->effectivePermissions()
            ),

            'status'    => $this->status,
            // Only meaningful while status === 'Pending Activation' — when
            // this passes, provisioning:expire-stale flips status to
            // 'Expired' (see Console\Commands\ExpireStaleProvisioning).
            'pending_expires_at' => $this->pending_expires_at,
            'created_at' => $this->created_at,  
        ];
    }

    // -------------------------------------------------------
    // Resolves role_id to a readable string.
    // Keeps frontend logic clean — check role_name, not numbers.
    // -------------------------------------------------------
    private function resolveRoleName(): string
    {
        return match ((int) $this->role_id) {
            SystemUser::ROLE_STUDENT     => 'student',
            SystemUser::ROLE_ALUMNI      => 'alumni',
            SystemUser::ROLE_ADMIN       => 'admin',
            SystemUser::ROLE_SUPER_ADMIN => 'super_admin',
            default                      => 'unknown',
        };
    }
}