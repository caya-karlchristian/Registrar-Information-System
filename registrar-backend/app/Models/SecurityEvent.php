<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use RuntimeException;

/**
 * SecurityEvent
 * =============
 * RIS-only security/debug signal — failed local-auth login attempts and
 * IDP-unreachable fallback events. See the create_security_events_table
 * migration's docblock for why this is a separate table from AuditLog
 * rather than new action constants on it.
 *
 * Unlike AuditLog, this table is NOT hash-chained — it's operational
 * signal for the RIS team, not a tamper-evident compliance record, and is
 * expected to be pruned on a retention schedule (see PruneSecurityEvents)
 * rather than kept forever.
 */
class SecurityEvent extends Model
{
    protected $primaryKey = 'security_event_id';

    // Write-once — no updated_at column exists on this table.
    public $timestamps = false;

    protected $fillable = [
        'event_type',
        'reason',
        'email',
        'ip_address',
        'user_agent',
        'metadata',
        'created_at',
    ];

    protected $casts = [
        'created_at' => 'datetime',
        'metadata'   => 'array',
    ];

    // -------------------------------------------------------
    // event_type constants — single source of truth, same pattern as
    // AuditLog's ACTION_* constants, so a typo never silently creates
    // an unqueryable event_type value.
    // -------------------------------------------------------
    public const EVENT_TYPE_LOGIN_FAILED    = 'login_failed';
    public const EVENT_TYPE_IDP_UNREACHABLE = 'idp_unreachable';

    // -------------------------------------------------------
    // reason constants — subtypes of EVENT_TYPE_LOGIN_FAILED.
    // Mirrors the distinct \RuntimeException branches inside
    // LocalAuthService::attempt().
    // -------------------------------------------------------
    public const REASON_USER_NOT_FOUND      = 'user_not_found';
    public const REASON_LOCAL_AUTH_DISABLED = 'local_auth_disabled';
    public const REASON_BAD_PASSWORD        = 'bad_password';
    public const REASON_INACTIVE_ACCOUNT    = 'inactive_account';

    // -------------------------------------------------------
    // Write-once enforcement.
    //
    // Mirrors AuditLog::booted() exactly — see that model's docblock for
    // the full reasoning. The one deliberate difference: retention
    // pruning (PruneSecurityEvents) deletes rows via a query-builder mass
    // delete (SecurityEvent::where(...)->delete()), which Eloquent does
    // NOT route through individual model events — so the guard below
    // only ever blocks a single-row $model->delete()/->update() call,
    // which is exactly the "deletion allowed only via retention job"
    // rule this class is supposed to enforce. No bypass flag needed.
    // -------------------------------------------------------
    protected static function booted(): void
    {
        static::updating(function () {
            throw new RuntimeException('SecurityEvent rows are write-once and cannot be updated.');
        });

        static::deleting(function () {
            throw new RuntimeException(
                'SecurityEvent rows cannot be deleted individually. '
                . 'Use the retention job (PruneSecurityEvents) or a direct mass-delete query.'
            );
        });
    }
}
