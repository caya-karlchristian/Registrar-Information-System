<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class RoleAssignmentResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'         => $this->id,
            'user'       => [
                'user_id' => $this->user?->user_id,
                'email'   => $this->user?->email,
            ],
            'role_id'    => $this->role_id,
            'policy'     => $this->whenLoaded('policy', fn () => $this->policy ? [
                'policy_id' => $this->policy->policy_id,
                'name'      => $this->policy->name,
            ] : null),

            // BUG FIX (RIS-PROCESS-BUGS #5 — "Role Status Remains 'Active'
            // Past Expiration Date and Time"): the stored `status` column
            // is only flipped Active -> Expired once a day by the
            // role-assignments:expire sweep, so a row can be functionally
            // expired for up to ~24h while this endpoint still reported
            // 'Active'. effective_status (App\Models\RoleAssignment) is a
            // computed accessor that reports 'Expired' the instant
            // expires_at has elapsed, regardless of whether the sweep has
            // run yet — this is what the frontend should render as the
            // badge. The raw column is intentionally still exposed below
            // as `stored_status` for any caller that specifically needs
            // to distinguish "already persisted as Expired" from "expired
            // but not yet swept" (e.g. an admin dashboard debugging the
            // sweep job itself).
            'status'        => $this->effective_status,
            'stored_status' => $this->status,

            'granted_by' => $this->when($this->granted_by, fn () => [
                'user_id' => $this->grantedBy?->user_id,
                'email'   => $this->grantedBy?->email,
            ]),
            'granted_at' => $this->granted_at,
            'expires_at' => $this->expires_at,
            'revoked_by' => $this->when($this->revoked_by, fn () => [
                'user_id' => $this->revokedBy?->user_id,
                'email'   => $this->revokedBy?->email,
            ]),
            'revoked_at'         => $this->revoked_at,
            'revocation_reason'  => $this->revocation_reason,
            'created_at'         => $this->created_at,
        ];
    }
}