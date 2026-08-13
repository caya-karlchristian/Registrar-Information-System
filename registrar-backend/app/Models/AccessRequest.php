<?php

namespace App\Models;

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
}