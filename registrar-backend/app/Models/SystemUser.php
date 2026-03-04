<?php

namespace App\Models;

use Illuminate\Foundation\Auth\User as Authenticatable;
use Laravel\Sanctum\HasApiTokens;

class SystemUser extends Authenticatable
{
    use HasApiTokens;

    protected $table = 'system_user';
    protected $primaryKey = 'user_id';
    public $timestamps = false;
    public const ROLE_STUDENT = 1;
    public const ROLE_ALUMNI = 2;
    public const ROLE_STAFF = 3;

    protected $fillable = [
        'name',
        'email',
        'password'
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    public function studentProfile()
    {
        return $this->hasOne(StudentProfile::class, 'user_id', 'user_id');
    }

    public function documentRequests()
    {
        return $this->hasMany(DocumentRequest::class, 'user_id');
    }

    public function changedRequests()
    {
        return $this->hasMany(RequestHistory::class, 'changed_by');
    }
    public function academicRecord()
    {
        return $this->hasOneThrough(
            StudentAcademicRecord::class,
            StudentProfile::class,
            'user_id',               // Foreign key on StudentProfile
            'student_profile_id',    // Foreign key on AcademicRecord
            'user_id',               // Local key on SystemUser
            'student_profile_id'     // StudentProfile primary key
        );
    }

    public function isStudent()
    {
        return $this->role_id === self::ROLE_STUDENT;
    }

    public function isAlumni()
    {
        return $this->role_id === self::ROLE_ALUMNI;
    }

    public function isStaff()
    {
        return $this->role_id === self::ROLE_STAFF;
    }

    public function loadIdentityRelations()
    {
        if ($this->isStudent()) {
            $this->load(['studentProfile', 'academicRecord']);
        }

        // if ($this->isAlumni()) {
        //     $this->load(['studentProfile']);
        // }

        // Staff relations can be added later
    }
}
