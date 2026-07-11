<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AuditLog extends Model
{
    // Write-once — no updated_at
    public $timestamps = false;

    protected $fillable = [
        'user_id',
        'email',
        'role_name',
        'action',
        'browser',
        'ip_address',
        'created_at',
    ];

    protected $casts = [
        'created_at' => 'datetime',
    ];

    // -------------------------------------------------------
    // Action constants — single source of truth.
    // Use these everywhere instead of raw strings so a typo
    // never silently creates a broken log entry.
    // -------------------------------------------------------
    public const ACTION_LOGIN           = 'login';
    public const ACTION_LOGOUT          = 'logout';
    public const ACTION_ADMIN_CREATED   = 'admin_created';
    public const ACTION_ADMIN_DELETED   = 'admin_deleted';
    public const ACTION_ADMIN_UPDATED   = 'admin_updated';  
    public const ACTION_ROLE_ASSIGNED   = 'role_assigned';
    public const ACTION_REQUEST_STATUS_CHANGED = 'request_status_changed';

    // User management — policy attachment (admins only)
    public const ACTION_POLICY_CREATED  = 'policy_created';
    public const ACTION_POLICY_UPDATED  = 'policy_updated';
    public const ACTION_POLICY_DELETED  = 'policy_deleted';
    public const ACTION_POLICY_ATTACHED = 'policy_attached';
    public const ACTION_POLICY_DETACHED = 'policy_detached';

    // -------------------------------------------------------
    // Relationship back to user (nullable — may be deleted)
    // -------------------------------------------------------
    public function user()
    {
        return $this->belongsTo(SystemUser::class, 'user_id', 'user_id');
    }
}