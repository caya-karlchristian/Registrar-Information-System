<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * A single grant of one role to one user. A user can hold more than one
 * Active row at once (e.g. Student + Admin — the "student staff" case),
 * which is the entire point of this table existing separately from
 * users.role_id: users.role_id/policy_id remain the "primary/default"
 * role for anything not yet migrated to read from here, while this table
 * is the source of truth for "what roles does this person actually hold
 * right now, and until when."
 *
 * Lifecycle: Active -> Expired (via role-assignments:expire, expires_at
 * elapsed) or Active -> Revoked (via RoleAssignmentService::revoke(), a
 * deliberate human action). Never deleted — same append-only-in-spirit
 * reasoning as SystemUser status transitions ("Expired"/"Deactivated"
 * rows are kept, not dropped, for audit trail).
 */
class RoleAssignment extends Model
{
    public const STATUS_ACTIVE  = 'Active';
    public const STATUS_EXPIRED = 'Expired';
    public const STATUS_REVOKED = 'Revoked';

    protected $fillable = [
        'user_id',
        'role_id',
        'policy_id',
        'status',
        'granted_by',
        'granted_at',
        'expires_at',
        'revoked_by',
        'revoked_at',
        'revocation_reason',
    ];

    protected $casts = [
        'granted_at' => 'datetime',
        'expires_at' => 'datetime',
        'revoked_at' => 'datetime',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    // -------------------------------------------------------
    // RELATIONSHIPS
    // -------------------------------------------------------

    public function user()
    {
        return $this->belongsTo(SystemUser::class, 'user_id', 'user_id');
    }

    public function policy()
    {
        return $this->belongsTo(Policy::class, 'policy_id', 'policy_id');
    }

    public function grantedBy()
    {
        return $this->belongsTo(SystemUser::class, 'granted_by', 'user_id');
    }

    public function revokedBy()
    {
        return $this->belongsTo(SystemUser::class, 'revoked_by', 'user_id');
    }

    // -------------------------------------------------------
    // SCOPES
    // -------------------------------------------------------

    public function scopeActive($query)
    {
        return $query->where('status', self::STATUS_ACTIVE);
    }

    /**
     * Active rows whose expires_at has elapsed but haven't been swept by
     * role-assignments:expire yet. Distinguishes "should be treated as
     * expired right now" from "status column already says Expired" —
     * hasModuleAccess()-style live checks should use this, not just
     * status = Active, since the sweep runs once a day rather than
     * instantly at the second of expiry.
     */
    public function scopeDueToExpire($query)
    {
        return $query->where('status', self::STATUS_ACTIVE)
            ->whereNotNull('expires_at')
            ->where('expires_at', '<', now());
    }

    public function isCurrentlyActive(): bool
    {
        return $this->status === self::STATUS_ACTIVE
            && (!$this->expires_at || $this->expires_at->isFuture());
    }
}
