<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Casts\Attribute;
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
 *
 * BUG FIX (RIS-PROCESS-BUGS #5 — "Role Status Remains 'Active' Past
 * Expiration Date and Time")
 * ---------------------------------------------------------------------
 * role-assignments:expire only sweeps the `status` column from Active to
 * Expired once a day (routes/console.php, dailyAt('08:20')). Every piece
 * of code that trusted the raw `status` column as "is this grant live
 * right now" — scopeActive() below, the Manage Roles modal, the grant()
 * duplicate check, the "last active role" guard in revoke() — was
 * therefore wrong for up to ~24h after expires_at elapsed.
 *
 * Two changes close that gap without waiting on the daily sweep:
 *
 *   1. scopeActive() now ALSO filters on expires_at, so every business
 *      rule built on ->active() (grant() duplicate check, revoke()'s
 *      "only active role" guard, switchTo(), policy usage counts,
 *      admin_grant resolution, SystemUserController's admin-tier
 *      filter) treats an unswept-but-expired row as not-active, the
 *      instant it expires — not just after the next 08:20 run.
 *
 *   2. effective_status is a computed (non-persisted) accessor that
 *      RoleAssignmentResource reads instead of the raw `status` column,
 *      so ANY endpoint that returns a RoleAssignment — including
 *      RoleAssignmentController::index(), which queries the table
 *      directly and does not go through scopeActive() at all — displays
 *      the correct live status immediately.
 *
 * role-assignments:expire is still required and unchanged: it's what
 * actually persists `status = Expired` to the DB (so this becomes true
 * "at rest", not just at read time) and revokes the affected account's
 * Sanctum tokens. Persisting eagerly here (e.g. in the accessor) is
 * deliberately avoided — accessors should not have side effects, and a
 * read-triggered write is a footgun under concurrent requests. See
 * App\Http\Middleware\EnsureRoleAssignmentActive for the real-time
 * session-revocation half of this fix.
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

    /**
     * "Currently active" — status is Active AND (no expiry, or the
     * expiry is still in the future). Deliberately time-aware rather
     * than a raw status-column filter, so every caller of ->active()
     * gets the live answer even for a row role-assignments:expire
     * hasn't swept yet. See class docblock (BUG FIX #5).
     */
    public function scopeActive($query)
    {
        return $query->where('status', self::STATUS_ACTIVE)
            ->where(function ($q) {
                $q->whereNull('expires_at')
                    ->orWhere('expires_at', '>', now());
            });
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

    /**
     * Live status for display purposes: identical to the stored `status`
     * column except it reports 'Expired' the instant expires_at has
     * elapsed, rather than waiting for role-assignments:expire's next
     * daily run to persist that. Revoked rows are unaffected (revocation
     * is immediate and already persisted synchronously by
     * RoleAssignmentService::revoke()).
     *
     * Purely computed — never written back to the DB from here. The
     * daily sweep (and, for the caller's OWN session,
     * EnsureRoleAssignmentActive) remain the only writers of the
     * persisted `status` column.
     */
    protected function effectiveStatus(): Attribute
    {
        return Attribute::make(
            get: fn () => ($this->status === self::STATUS_ACTIVE
                && $this->expires_at
                && $this->expires_at->isPast())
                ? self::STATUS_EXPIRED
                : $this->status,
        );
    }
}