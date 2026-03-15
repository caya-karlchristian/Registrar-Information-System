<?php

namespace App\Models;

use Illuminate\Foundation\Auth\User as Authenticatable;
use Laravel\Sanctum\HasApiTokens;
use App\Models\AdminProfile;
use App\Models\Alumni;
use App\Models\AlumniProfile;
use App\Models\AlumniType;

class SystemUser extends Authenticatable
{
    use HasApiTokens;

    protected $table = 'users';
    protected $primaryKey = 'user_id';
    public $timestamps = false;

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
        'idp_user_id',  // ← ADD
    ];

    protected $hidden = [
        'password',
    ];

    protected $casts = [
        'created_at' => 'datetime',
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

    public function alumni()
    {
        return $this->hasOne(Alumni::class, 'user_id', 'user_id');
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
            $this->load(['adminProfile']);
            return;
        }
    }

    public function adminProfile()
    {
        return $this->hasOne(AdminProfile::class, 'user_id', 'user_id');
    }
}