<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class AccessRequestResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'                 => $this->id,
            'requested_by'       => [
                'user_id' => $this->requestedBy?->user_id,
                'email'   => $this->requestedBy?->email,
                'name'    => trim(($this->requestedBy?->adminProfile?->first_name ?? '') . ' ' . ($this->requestedBy?->adminProfile?->last_name ?? '')),
            ],
            'target_email'       => $this->target_email,
            'target_first_name'  => $this->target_first_name,
            'target_last_name'   => $this->target_last_name,
            'requested_role_id'  => $this->requested_role_id,
            'requested_role'     => $this->requested_role_id === \App\Models\SystemUser::ROLE_SUPER_ADMIN ? 'Super Admin' : 'Admin',
            'requested_policy'   => $this->whenLoaded('requestedPolicy', fn () => $this->requestedPolicy ? [
                'policy_id' => $this->requestedPolicy->policy_id,
                'name'      => $this->requestedPolicy->name,
            ] : null),
            'justification'      => $this->justification,
            'status'             => $this->status,
            'reviewed_by'        => $this->when($this->reviewed_by, fn () => [
                'user_id' => $this->reviewedBy?->user_id,
                'email'   => $this->reviewedBy?->email,
            ]),
            'reviewed_at'        => $this->reviewed_at,
            'rejection_reason'   => $this->rejection_reason,
            'fulfilled_user_id'  => $this->fulfilled_user_id,
            'expires_at'         => $this->expires_at,
            'created_at'         => $this->created_at,
        ];
    }
}
