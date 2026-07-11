<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * A reusable, named set of module permissions that can be attached to
 * admin (role_id = 3) accounts. Super admins never carry a policy — they
 * always have unrestricted access (see SystemUser::isSuperAdmin()).
 *
 * `permissions` shape mirrors the frontend's MODULE_OPTIONS /
 * LABEL_TO_KEY maps 1:1 so PolicyManagement.jsx / PolicyModal.jsx can
 * round-trip it without translation on the client:
 *
 *   {
 *     "dashboard": ["Access"],
 *     "inbox":     [],
 *     "analytics": ["Access"],
 *     "logbook":   [],
 *     "profile":   []
 *   }
 */
class Policy extends Model
{
    protected $table = 'policies';
    protected $primaryKey = 'policy_id';

    protected $fillable = [
        'name',
        'permissions',
        'is_system',
    ];

    protected $casts = [
        'permissions' => 'array',
        'is_system'   => 'boolean',
        'created_at'  => 'datetime',
        'updated_at'  => 'datetime',
    ];

    // -------------------------------------------------------
    // RELATIONSHIPS
    // -------------------------------------------------------

    /**
     * Admins this policy is currently attached to.
     */
    public function users()
    {
        return $this->hasMany(SystemUser::class, 'policy_id', 'policy_id');
    }
}
