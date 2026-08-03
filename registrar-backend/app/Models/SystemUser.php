<?php

namespace App\Models;

use Illuminate\Foundation\Auth\User as Authenticatable;
use Laravel\Sanctum\HasApiTokens;
use App\Models\AdminProfile;
use App\Models\Alumni;
use App\Models\AlumniProfile;
use App\Models\AlumniType;
use App\Models\AlumniAcademicRecord;
use App\Models\Policy;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class SystemUser extends Authenticatable
{
    use HasApiTokens, HasFactory;

    protected $table = 'users';
    protected $primaryKey = 'user_id';
    public $timestamps = false;

    /**
     * Laravel's Authenticatable base returns 'id' by default.
     * Without this override, Auth::id() reads $this->id (null),
     * which breaks Broadcast::auth() — the channel closure receives
     * a valid $user but the framework cannot confirm the socket's
     * identity, so every private-channel subscription is rejected.
     */
    public function getAuthIdentifierName(): string
    {
        return 'user_id';
    }

    // -------------------------------------------------------
    // Role constants — must match your roles table:
    // 1 = student, 2 = alumni, 3 = admin, 4 = super_admin
    // -------------------------------------------------------
    public const ROLE_STUDENT     = 1;
    public const ROLE_ALUMNI      = 2;
    public const ROLE_ADMIN       = 3;
    public const ROLE_SUPER_ADMIN = 4;

    protected $fillable = [
        'email',
        'password',
        'role_id',   // needed when creating users programmatically
        'status',
        'idp_user_id',
        'idp_access_token',
        'local_auth_enabled', // 1 = local bcrypt password is active and usable as IDP fallback
        'policy_id', // admin-only — the module-permissions policy attached to this account
        // Only meaningful while status === 'Pending Activation'. Set on
        // creation (direct or via an approved access request) and cleared
        // on activation. Past this timestamp, provisioning:expire-stale
        // flips status to 'Expired' — see Console\Commands\ExpireStaleProvisioning.
        'pending_expires_at',
    ];

    protected $hidden = [
        'idp_access_token',
        'password',
    ];

    protected $casts = [
        'created_at'         => 'datetime',
        'pending_expires_at' => 'datetime',
        // Encrypt the live IdP credential at rest.
        // Laravel uses APP_KEY (AES-256-CBC) — reads/writes are transparent.
        'idp_access_token'   => 'encrypted',
    ];

    // -------------------------------------------------------
    // RELATIONSHIPS
    // -------------------------------------------------------

    public function studentProfile()
    {
        return $this->hasOne(StudentProfile::class, 'user_id', 'user_id');
    }

    public function documentRequests()
    {
        return $this->hasMany(DocumentRequest::class, 'user_id', 'user_id');
    }

    // HasOneThrough: User → StudentProfile → StudentAcademicRecord
    public function academicRecord()
    {
        return $this->hasOneThrough(
            StudentAcademicRecord::class,
            StudentProfile::class,
            'user_id',            // FK on student_profile → users
            'student_profile_id', // FK on student_academic_record → student_profile
            'user_id',            // Local key on users
            'student_profile_id'  // Local key on student_profile
        );
    }

    public function alumniProfile()
    {
        return $this->hasOneThrough(
            AlumniProfile::class,
            Alumni::class,
            'user_id',    // FK on alumni → users
            'alumni_id',  // FK on alumni_profile → alumni
            'user_id',    // Local key on users
            'alumni_id'   // Local key on alumni
        );
    }

    public function alumniAcademicRecord()
    {
        return $this->hasManyThrough(
            AlumniAcademicRecord::class,
            AlumniProfile::class,
            'alumni_id',         // FK on alumni_profile → alumni
            'alumni_profile_id', // FK on alumni_academic_record → alumni_profile
            'user_id',           // Local key chain start — but we need alumni first
            'alumni_profile_id'  // Local key on alumni_profile
        );
    }

    public function alumni()
    {
        return $this->hasOne(Alumni::class, 'user_id', 'user_id');
    }

    /**
     * The module-permissions policy attached to this account.
     * Only meaningful for admins (role_id = 3) — super admins bypass
     * policy checks entirely (see isSuperAdmin()).
     */
    public function policy()
    {
        return $this->belongsTo(Policy::class, 'policy_id', 'policy_id');
    }

    // -------------------------------------------------------
    // ROLE HELPERS
    // -------------------------------------------------------

    public function isStudent(): bool
    {
        return $this->role_id === self::ROLE_STUDENT;
    }

    public function isAlumni(): bool
    {
        return $this->role_id === self::ROLE_ALUMNI;
    }

    public function isAdmin(): bool
    {
        return $this->role_id === self::ROLE_ADMIN;
    }

    public function isSuperAdmin(): bool
    {
        return $this->role_id === self::ROLE_SUPER_ADMIN;
    }

    // True for any staff-level access (admin OR super admin)
    // Useful for "can this user manage requests?" type checks
    public function isStaff(): bool
    {
        return in_array($this->role_id, [self::ROLE_ADMIN, self::ROLE_SUPER_ADMIN]);
    }

    // -------------------------------------------------------
    // POLICY / MODULE-PERMISSION HELPERS
    //
    // Single source of truth for "what can this admin actually reach".
    // Both EnsureModuleAccess (backend gate) and UserResource
    // (effective_permissions sent to the frontend) call through here,
    // so there is exactly one place that resolves "no policy attached"
    // -> default policy -> deny.
    // -------------------------------------------------------

    /**
     * The module => actions permissions map that actually applies to
     * this user right now — their own policy if attached, otherwise
     * the system default policy, otherwise nothing (fail closed).
     *
     * Only meaningful for admins. Super admins have unrestricted
     * access (see hasModuleAccess()) and other roles aren't gated by
     * the policy system at all, so this always returns [] for them —
     * callers should not use this to make access decisions for
     * non-admins.
     */
    public function effectivePermissions(): array
    {
        if (!$this->isAdmin()) {
            return [];
        }

        // `policy` may already be eager-loaded (see loadIdentityRelations());
        // this only issues a query the first time it's touched otherwise.
        $policy = $this->policy;

        if (!$policy) {
            $policy = Policy::where('name', Policy::DEFAULT_NAME)->first();
        }

        return $policy->permissions ?? [];
    }

    /**
     * Can this user access the given module ("dashboard", "analytics",
     * "logbook", ...)? This is the one method both the API middleware
     * and any future frontend/backend check should call — never
     * inspect policy_id / permissions directly.
     *
     * - Super admins: always true (unrestricted, per product policy).
     * - Students / alumni: always true — the policy-attachment feature
     *   only ever restricts admin accounts.
     * - Admins: true only if their effective policy explicitly grants
     *   the module. Unknown module or no resolvable policy => false
     *   (fail closed, not fail open).
     */
    public function hasModuleAccess(string $module): bool
    {
        if ($this->isSuperAdmin()) {
            return true;
        }

        if (!$this->isAdmin()) {
            return true;
        }

        if (!in_array($module, Policy::MODULE_KEYS, true)) {
            return false;
        }

        $granted = $this->effectivePermissions()[$module] ?? null;

        return !empty($granted);
    }

    // -------------------------------------------------------
    // IDENTITY RELATION LOADER
    // Called by AuthController@me to attach role-specific data
    // -------------------------------------------------------

    public function loadIdentityRelations(): void
    {
        if ($this->isStudent()) {
            $this->load(['studentProfile', 'academicRecord']);
            return;
        }

        if ($this->isAlumni()) {
            // Alumni profile relation ready — uncomment when alumni module is built
            $this->load(['alumniProfile']);
            return;
        }

        if ($this->isAdmin() || $this->isSuperAdmin()) {
            // Admin/Super Admin don't have student profiles
            // Load admin-specific relations here when needed
            $this->load(['adminProfile', 'policy']);
            return;
        }
    }

    public function adminProfile()
    {
        return $this->hasOne(AdminProfile::class, 'user_id', 'user_id');
    }

    protected static function newFactory()
    {
        return \Database\Factories\SystemUserFactory::new();
    }
}