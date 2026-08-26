<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;

/**
 * A scoped, audited admin override for one (or_number, user_id) pair —
 * see the cashier_or_overrides migration's docblock for the full
 * rationale (industry-standard alternative to blanking CASHIER_API_KEY
 * system-wide).
 *
 * Consumed by DocumentRequestController::verifyReceiptAgainstCashier(),
 * which checks activeFor() before calling the real Cashier API, and
 * marked used by DocumentRequestController::store() only on a
 * successful submission — never by the pre-submission verify-or step,
 * mirroring how a normal (non-override) OR is never "spent" just by
 * being checked.
 */
class CashierOrOverride extends Model
{
    protected $table      = 'cashier_or_overrides';
    protected $primaryKey = 'override_id';

    protected $fillable = [
        'or_number',
        'user_id',
        'reason',
        'verified_items',
        'created_by',
        'created_by_role',
        'used_at',
        'used_by_request_id',
        'revoked_at',
        'revoked_by',
    ];

    protected $casts = [
        'verified_items' => 'array',
        'used_at'        => 'datetime',
        'revoked_at'     => 'datetime',
        'created_at'     => 'datetime',
        'updated_at'     => 'datetime',
    ];

    // -------------------------------------------------------
    // Relationships
    // -------------------------------------------------------

    public function user()
    {
        return $this->belongsTo(SystemUser::class, 'user_id', 'user_id');
    }

    public function createdByUser()
    {
        return $this->belongsTo(SystemUser::class, 'created_by', 'user_id');
    }

    public function revokedByUser()
    {
        return $this->belongsTo(SystemUser::class, 'revoked_by', 'user_id');
    }

    public function usedByRequest()
    {
        return $this->belongsTo(DocumentRequest::class, 'used_by_request_id', 'request_id');
    }

    // -------------------------------------------------------
    // Query scopes
    // -------------------------------------------------------

    /**
     * Active = not yet consumed, not revoked. Only an active override
     * is eligible to bypass Cashier API verification.
     */
    public function scopeActive(Builder $query): Builder
    {
        return $query->whereNull('used_at')->whereNull('revoked_at');
    }

    /**
     * The single active override (if any) for a given OR number + user.
     * Returns null when none exists, when it was already consumed, or
     * when it was revoked — all three cases mean "no override applies,
     * fall through to normal Cashier API verification."
     *
     * or_number is matched trimmed — same normalisation the rest of the
     * cashier flow already applies to OR numbers before comparing them
     * (see CashierService::isOrAlreadyUsed()).
     */
    public static function activeFor(string $orNumber, int $userId): ?self
    {
        return static::query()
            ->active()
            ->where('or_number', trim($orNumber))
            ->where('user_id', $userId)
            ->latest('override_id')
            ->first();
    }
}
