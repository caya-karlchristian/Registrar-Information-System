<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Model;

class AccessRequest extends Model
{
    protected $table = 'access_requests';

    public const STATUS_REQUESTED = 'Requested';
    public const STATUS_APPROVED  = 'Approved';
    public const STATUS_REJECTED  = 'Rejected';
    public const STATUS_FULFILLED = 'Fulfilled';
    public const STATUS_EXPIRED   = 'Expired';

    protected $fillable = [
        'requested_by',
        'target_email',
        'target_first_name',
        'target_middle_name',
        'target_last_name',
        'target_suffix',
        'requested_role_id',
        'requested_policy_id',
        'justification',
        'status',
        'reviewed_by',
        'reviewed_at',
        'rejection_reason',
        'fulfilled_user_id',
        'expires_at',
    ];

    protected $casts = [
        'reviewed_at' => 'datetime',
        'expires_at'  => 'datetime',
        'created_at'  => 'datetime',
        'updated_at'  => 'datetime',
    ];

    public function requestedBy()
    {
        return $this->belongsTo(SystemUser::class, 'requested_by', 'user_id');
    }

    public function reviewedBy()
    {
        return $this->belongsTo(SystemUser::class, 'reviewed_by', 'user_id');
    }

    public function fulfilledUser()
    {
        return $this->belongsTo(SystemUser::class, 'fulfilled_user_id', 'user_id');
    }

    public function requestedPolicy()
    {
        return $this->belongsTo(Policy::class, 'requested_policy_id', 'policy_id');
    }

    public function scopePending($query)
    {
        return $query->where('status', self::STATUS_REQUESTED);
    }

    // -------------------------------------------------------
    // BUG FIX (QA #11 — "Expired Status Not Auto-Tagged")
    //
    // Same class of bug as RoleAssignment::scopeActive() /
    // effectiveStatus() (see that class's docblock) — before this fix,
    // AccessRequest had NO time-aware check at all: scopePending() and
    // AccessRequestService::assertPending() only ever compared the raw
    // `status` column to STATUS_REQUESTED, so a request past its 7-day
    // expires_at window could still be approved or rejected by a Super
    // Admin for up to ~24h, until provisioning:expire-stale's next
    // 08:15 run flips it to 'Expired'. Approving one would create a
    // real SystemUser account from a request that should already have
    // been auto-rejected — this is a genuine write-path gap, not just a
    // display issue.
    // -------------------------------------------------------

    /**
     * "Still genuinely actionable right now" — status is Requested AND
     * (no expiry, or the expiry is still in the future). Time-aware
     * counterpart to scopePending() above; use this wherever code is
     * about to ACT on a request (approve/reject), not just list/filter
     * by the stored status.
     */
    public function isCurrentlyPending(): bool
    {
        return $this->status === self::STATUS_REQUESTED
            && (!$this->expires_at || $this->expires_at->isFuture());
    }

    /**
     * Live status for display purposes: identical to the stored
     * `status` column except it reports 'Expired' the instant
     * expires_at has elapsed, rather than waiting for
     * provisioning:expire-stale's next daily run to persist that.
     * Mirrors RoleAssignment::effectiveStatus() — purely computed,
     * never written back to the DB from here.
     */
    protected function effectiveStatus(): Attribute
    {
        return Attribute::make(
            get: fn () => ($this->status === self::STATUS_REQUESTED
                && $this->expires_at
                && $this->expires_at->isPast())
                ? self::STATUS_EXPIRED
                : $this->status,
        );
    }
}