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
            'status'     => $this->status,
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
