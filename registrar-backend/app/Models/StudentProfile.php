<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class StudentProfile extends Model
{
    use HasFactory;
    protected $table = 'student_profile';
    protected $primaryKey = 'student_profile_id';
    public $timestamps = false;
    // sex_at_birth/place_of_birth are set internally by UserProvisioningService
    // and OgosStudentService via create()/updateOrCreate(), not through
    // StudentProfileController's validated input — must stay fillable.
    protected $fillable = ['user_id', 'first_name', 'middle_name', 'last_name', 'suffix', 'date_of_birth', 'place_of_birth', 'sex_at_birth'];

    public function user()
    {
        return $this->belongsTo(SystemUser::class, 'user_id');
    }

    public function academicRecords()
    {
        return $this->hasMany(StudentAcademicRecord::class, 'student_profile_id');
    }

    /** Singular — first (typically only) academic record for this profile. */
    public function academicRecord()
    {
        return $this->hasOne(StudentAcademicRecord::class, 'student_profile_id');
    }

    public function documentRequests()
    {
        return $this->hasMany(DocumentRequest::class, 'student_profile_id');
    }

    public function contactInformation()
    {
        return $this->hasOne(StudentContactInformation::class, 'student_profile_id');
    }

    public function addresses()
    {
        return $this->hasMany(StudentAddress::class, 'student_profile_id');
    }
}
