<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use RuntimeException;

class AuditLog extends Model
{
    // Write-once — no updated_at
    public $timestamps = false;

    protected $fillable = [
        'user_id',
        'email',
        'role_name',
        'target_user_id',
        'target_email',
        'action',
        'browser',
        'ip_address',
        'metadata',
        'prev_hash',
        'hash',
        'created_at',
    ];

    protected $casts = [
        'created_at' => 'datetime',
        'metadata'   => 'array',
    ];

    // -------------------------------------------------------
    // Action constants — single source of truth.
    // Use these everywhere instead of raw strings so a typo
    // never silently creates a broken log entry.
    // -------------------------------------------------------
    public const ACTION_LOGIN           = 'login';
    public const ACTION_LOGOUT          = 'logout';
    public const ACTION_ADMIN_CREATED   = 'admin_created';
    public const ACTION_ADMIN_ACTIVATED = 'admin_activated';
    public const ACTION_ADMIN_DELETED   = 'admin_deleted';
    public const ACTION_ADMIN_UPDATED   = 'admin_updated';
    public const ACTION_ADMIN_EXPIRED   = 'admin_expired';
    // RIS-side activation/deactivation (or password change) succeeded but
    // the best-effort push to the IdP failed — see AdminUserService::update().
    // The RIS-side change is NOT rolled back; this exists purely so ops can
    // see, from the audit trail, that the two systems may be out of sync
    // and reconcile the IdP side by hand.
    public const ACTION_ADMIN_IDP_SYNC_FAILED = 'admin_idp_sync_failed';
    public const ACTION_ROLE_ASSIGNED   = 'role_assigned';   // granted (RoleAssignmentService::grant)
    public const ACTION_ROLE_REVOKED    = 'role_revoked';    // explicit revoke (RoleAssignmentService::revoke)
    public const ACTION_ROLE_EXPIRED    = 'role_expired';    // automatic sweep (role-assignments:expire)
    public const ACTION_ROLE_SWITCHED   = 'role_switched';   // session assumed a different held role (Step 3)
    public const ACTION_REQUEST_STATUS_CHANGED = 'request_status_changed';
    public const ACTION_REQUEST_ARCHIVED       = 'request_archived';
    public const ACTION_REQUEST_RESTORED       = 'request_restored';

    // Document / certificate type management — archiving
    public const ACTION_DOCUMENT_TYPE_ARCHIVED    = 'document_type_archived';
    public const ACTION_DOCUMENT_TYPE_RESTORED    = 'document_type_restored';
    public const ACTION_CERTIFICATE_TYPE_ARCHIVED = 'certificate_type_archived';
    public const ACTION_CERTIFICATE_TYPE_RESTORED = 'certificate_type_restored';

    // Announcement archiving (distinct from the enable/disable toggle,
    // which is not audit-logged — see the Announcement Archive policy)
    public const ACTION_ANNOUNCEMENT_ARCHIVED = 'announcement_archived';
    public const ACTION_ANNOUNCEMENT_RESTORED = 'announcement_restored';

    // Business calendar management — dated exceptions (holidays,
    // suspensions, one-off events) and recurring overrides (e.g. WFH
    // Mondays). Gated behind role:3,4 + module:business_calendar — see
    // CalendarExceptionController / CalendarOverrideController.
    public const ACTION_CALENDAR_EXCEPTION_CREATED = 'calendar_exception_created';
    public const ACTION_CALENDAR_EXCEPTION_UPDATED = 'calendar_exception_updated';
    public const ACTION_CALENDAR_EXCEPTION_DELETED = 'calendar_exception_deleted';
    public const ACTION_CALENDAR_OVERRIDE_CREATED  = 'calendar_override_created';
    public const ACTION_CALENDAR_OVERRIDE_UPDATED  = 'calendar_override_updated';
    public const ACTION_CALENDAR_OVERRIDE_DELETED  = 'calendar_override_deleted';

    // User management — policy attachment (admins only)
    public const ACTION_POLICY_CREATED  = 'policy_created';
    public const ACTION_POLICY_UPDATED  = 'policy_updated';
    public const ACTION_POLICY_DELETED  = 'policy_deleted';
    public const ACTION_POLICY_ATTACHED = 'policy_attached';
    public const ACTION_POLICY_DETACHED = 'policy_detached';

    // Self-service access requests (see AccessRequestService)
    public const ACTION_ACCESS_REQUEST_SUBMITTED = 'access_request_submitted';
    public const ACTION_ACCESS_REQUEST_APPROVED  = 'access_request_approved';
    public const ACTION_ACCESS_REQUEST_REJECTED  = 'access_request_rejected';
    public const ACTION_ACCESS_REQUEST_EXPIRED   = 'access_request_expired';

    // Cashier OR verification attempts (see NameMatcher, DocumentRequestController::store)
    // Logged for every attempt regardless of outcome — not just failures —
    // via the existing tamper-evident audit_log table rather than a new
    // one, so this survives container recreation the way storage/logs
    // currently does not (see 2026-08-11 incident notes).
    public const ACTION_CASHIER_VERIFICATION = 'cashier_verification';

    // Unmatched cashier receipt labels — admin resolution (see
    // UnmatchedCashierItem, CashierDocumentSuggester)
    public const ACTION_UNMATCHED_CASHIER_ITEM_RESOLVED  = 'unmatched_cashier_item_resolved';
    public const ACTION_UNMATCHED_CASHIER_ITEM_DISMISSED = 'unmatched_cashier_item_dismissed';

    // -------------------------------------------------------
    // Relationship back to the acting user (nullable — may be deleted)
    // -------------------------------------------------------
    public function user()
    {
        return $this->belongsTo(SystemUser::class, 'user_id', 'user_id');
    }

    // -------------------------------------------------------
    // Relationship to the user the action was performed ON,
    // e.g. the admin account created/updated/deleted. Distinct
    // from user() — that's always the actor.
    // -------------------------------------------------------
    public function targetUser()
    {
        return $this->belongsTo(SystemUser::class, 'target_user_id', 'user_id');
    }

    // -------------------------------------------------------
    // Append-only enforcement (tamper-evident audit log).
    //
    // audit_logs rows are chained by hash (see AuditLogger::log() and the
    // `audit:verify` command) — a row that could be edited or deleted after
    // the fact would silently break that guarantee no matter how careful
    // the hash-chaining logic is. This is the second, independent layer:
    // even a bug or a rogue direct-Eloquent call elsewhere in the
    // application can never update or delete an audit_logs row, full stop.
    //
    // This is an application-layer guard, not a DB-level one — a
    // sufficiently privileged direct SQL statement could still bypass it.
    // Locking down GRANTs on the audit_logs table at the database level is
    // a complementary, infra-level hardening step outside this model's
    // reach and should be applied in production alongside this.
    // -------------------------------------------------------
    protected static function booted(): void
    {
        static::updating(function () {
            throw new RuntimeException('AuditLog rows are append-only and cannot be updated.');
        });

        static::deleting(function () {
            throw new RuntimeException('AuditLog rows are append-only and cannot be deleted.');
        });
    }
}<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use RuntimeException;

class AuditLog extends Model
{
    // Write-once — no updated_at
    public $timestamps = false;

    protected $fillable = [
        'user_id',
        'email',
        'role_name',
        'target_user_id',
        'target_email',
        'action',
        'browser',
        'ip_address',
        'metadata',
        'prev_hash',
        'hash',
        'created_at',
    ];

    protected $casts = [
        'created_at' => 'datetime',
        'metadata'   => 'array',
    ];

    // -------------------------------------------------------
    // Action constants — single source of truth.
    // Use these everywhere instead of raw strings so a typo
    // never silently creates a broken log entry.
    // -------------------------------------------------------
    public const ACTION_LOGIN           = 'login';
    public const ACTION_LOGOUT          = 'logout';
    public const ACTION_ADMIN_CREATED   = 'admin_created';
    public const ACTION_ADMIN_ACTIVATED = 'admin_activated';
    public const ACTION_ADMIN_DELETED   = 'admin_deleted';
    public const ACTION_ADMIN_UPDATED   = 'admin_updated';
    public const ACTION_ADMIN_EXPIRED   = 'admin_expired';
    // RIS-side activation/deactivation (or password change) succeeded but
    // the best-effort push to the IdP failed — see AdminUserService::update().
    // The RIS-side change is NOT rolled back; this exists purely so ops can
    // see, from the audit trail, that the two systems may be out of sync
    // and reconcile the IdP side by hand.
    public const ACTION_ADMIN_IDP_SYNC_FAILED = 'admin_idp_sync_failed';
    public const ACTION_ROLE_ASSIGNED   = 'role_assigned';   // granted (RoleAssignmentService::grant)
    public const ACTION_ROLE_REVOKED    = 'role_revoked';    // explicit revoke (RoleAssignmentService::revoke)
    public const ACTION_ROLE_EXPIRED    = 'role_expired';    // automatic sweep (role-assignments:expire)
    public const ACTION_ROLE_SWITCHED   = 'role_switched';   // session assumed a different held role (Step 3)
    public const ACTION_REQUEST_STATUS_CHANGED = 'request_status_changed';
    public const ACTION_REQUEST_ARCHIVED       = 'request_archived';
    public const ACTION_REQUEST_RESTORED       = 'request_restored';

    // Document / certificate type management — archiving
    public const ACTION_DOCUMENT_TYPE_ARCHIVED    = 'document_type_archived';
    public const ACTION_DOCUMENT_TYPE_RESTORED    = 'document_type_restored';
    public const ACTION_CERTIFICATE_TYPE_ARCHIVED = 'certificate_type_archived';
    public const ACTION_CERTIFICATE_TYPE_RESTORED = 'certificate_type_restored';

    // Announcement archiving (distinct from the enable/disable toggle,
    // which is not audit-logged — see the Announcement Archive policy)
    public const ACTION_ANNOUNCEMENT_ARCHIVED = 'announcement_archived';
    public const ACTION_ANNOUNCEMENT_RESTORED = 'announcement_restored';

    // Business calendar management — dated exceptions (holidays,
    // suspensions, one-off events) and recurring overrides (e.g. WFH
    // Mondays). Gated behind role:3,4 + module:business_calendar — see
    // CalendarExceptionController / CalendarOverrideController.
    public const ACTION_CALENDAR_EXCEPTION_CREATED = 'calendar_exception_created';
    public const ACTION_CALENDAR_EXCEPTION_UPDATED = 'calendar_exception_updated';
    public const ACTION_CALENDAR_EXCEPTION_DELETED = 'calendar_exception_deleted';
    public const ACTION_CALENDAR_OVERRIDE_CREATED  = 'calendar_override_created';
    public const ACTION_CALENDAR_OVERRIDE_UPDATED  = 'calendar_override_updated';
    public const ACTION_CALENDAR_OVERRIDE_DELETED  = 'calendar_override_deleted';

    // User management — policy attachment (admins only)
    public const ACTION_POLICY_CREATED  = 'policy_created';
    public const ACTION_POLICY_UPDATED  = 'policy_updated';
    public const ACTION_POLICY_DELETED  = 'policy_deleted';
    public const ACTION_POLICY_ATTACHED = 'policy_attached';
    public const ACTION_POLICY_DETACHED = 'policy_detached';

    // Self-service access requests (see AccessRequestService)
    public const ACTION_ACCESS_REQUEST_SUBMITTED = 'access_request_submitted';
    public const ACTION_ACCESS_REQUEST_APPROVED  = 'access_request_approved';
    public const ACTION_ACCESS_REQUEST_REJECTED  = 'access_request_rejected';
    public const ACTION_ACCESS_REQUEST_EXPIRED   = 'access_request_expired';

    // Cashier OR verification attempts (see NameMatcher, DocumentRequestController::store)
    // Logged for every attempt regardless of outcome — not just failures —
    // via the existing tamper-evident audit_log table rather than a new
    // one, so this survives container recreation the way storage/logs
    // currently does not (see 2026-08-11 incident notes).
    public const ACTION_CASHIER_VERIFICATION = 'cashier_verification';

    // Unmatched cashier receipt labels — admin resolution (see
    // UnmatchedCashierItem, CashierDocumentSuggester)
    public const ACTION_UNMATCHED_CASHIER_ITEM_RESOLVED  = 'unmatched_cashier_item_resolved';
    public const ACTION_UNMATCHED_CASHIER_ITEM_DISMISSED = 'unmatched_cashier_item_dismissed';

    // -------------------------------------------------------
    // Relationship back to the acting user (nullable — may be deleted)
    // -------------------------------------------------------
    public function user()
    {
        return $this->belongsTo(SystemUser::class, 'user_id', 'user_id');
    }

    // -------------------------------------------------------
    // Relationship to the user the action was performed ON,
    // e.g. the admin account created/updated/deleted. Distinct
    // from user() — that's always the actor.
    // -------------------------------------------------------
    public function targetUser()
    {
        return $this->belongsTo(SystemUser::class, 'target_user_id', 'user_id');
    }

    // -------------------------------------------------------
    // Append-only enforcement (tamper-evident audit log).
    //
    // audit_logs rows are chained by hash (see AuditLogger::log() and the
    // `audit:verify` command) — a row that could be edited or deleted after
    // the fact would silently break that guarantee no matter how careful
    // the hash-chaining logic is. This is the second, independent layer:
    // even a bug or a rogue direct-Eloquent call elsewhere in the
    // application can never update or delete an audit_logs row, full stop.
    //
    // This is an application-layer guard, not a DB-level one — a
    // sufficiently privileged direct SQL statement could still bypass it.
    // Locking down GRANTs on the audit_logs table at the database level is
    // a complementary, infra-level hardening step outside this model's
    // reach and should be applied in production alongside this.
    // -------------------------------------------------------
    protected static function booted(): void
    {
        static::updating(function () {
            throw new RuntimeException('AuditLog rows are append-only and cannot be updated.');
        });

        static::deleting(function () {
            throw new RuntimeException('AuditLog rows are append-only and cannot be deleted.');
        });
    }
}