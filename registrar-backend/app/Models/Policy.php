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
    /**
     * Canonical list of module keys that a policy's `permissions` JSON
     * may grant. This is the single source of truth for "what is a
     * valid module" — PolicyResource's labels, PolicyService's input
     * sanitization, and EnsureModuleAccess's gating all key off this
     * list, so adding a new gate-able module only ever requires
     * touching this array (plus the frontend's mirrored MODULE_KEYS in
     * src/utils/policy.js).
     */
    public const MODULE_KEYS = ['dashboard', 'inbox', 'analytics', 'logbook', 'profile', 'access_requests', 'business_calendar'];

    /**
     * Per-module action vocabulary — the single source of truth for
     * "what actions can be granted on this module" wherever a module
     * needs finer-grained permissions than the default single-token
     * 'Access' toggle.
     *
     * Any module NOT listed here stays a single-token module: its only
     * valid permission value is ['Access'] (module-level allow) or []
     * (deny). Modules listed here instead grant a SUBSET of their
     * action list, e.g. dashboard => ['View', 'Complete'] for a
     * Student Staff policy.
     *
     * Consumers of this map:
     *   - SystemUser::hasModuleAccess($module, $action) checks a
     *     specific action is present in the granted array.
     *   - PolicyService::sanitizePermissions() drops any token that
     *     isn't in this module's action list (or, for unlisted
     *     modules, isn't 'Access') before persisting.
     *   - PolicyManagement.jsx mirrors this shape via its own
     *     per-module checkbox groups for Dashboard/Logbook.
     *
     * Work Item #1 — Granular Per-Action Permissions. Do not add
     * 'inbox' here: it is notifications-only and stays a single-token
     * 'Access' module.
     */
    public const MODULE_ACTIONS = [
        'dashboard' => ['View', 'Process', 'Complete'],
        'logbook'   => ['View', 'Export'],
    ];

    /**
     * The valid action tokens for a given module — its own action list
     * if it has one (see MODULE_ACTIONS), otherwise the default
     * single-token 'Access' vocabulary every other module uses.
     *
     * @return array<string>
     */
    public static function actionsFor(string $module): array
    {
        return self::MODULE_ACTIONS[$module] ?? ['Access'];
    }

    /**
     * The policy new/legacy admin accounts fall back to when they have
     * no policy_id attached (see SystemUser::effectivePermissions()).
     * Must match one of the `is_system` rows seeded in the
     * database — see the 2026_08_03_000005_seed_zero_access_default_policy
     * migration.
     *
     * SECURITY: this MUST be a zero-access policy. An admin with no
     * policy_id (freshly created without one, an access request approved
     * with no policy selected, or their old policy row was deleted — see
     * PolicyService::delete()) has no business inheriting whatever
     * permissions happen to live under this name. Fail closed: nothing,
     * until a super admin deliberately attaches a real policy. This used
     * to point at 'Registrar Staff', which grants Analytics + Logbook —
     * that was a real access-control gap, not a naming detail, so don't
     * repoint this at any policy that grants access to anything.
     */
    public const DEFAULT_NAME = 'No Access';

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