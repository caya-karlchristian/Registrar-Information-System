<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class StudentProfile extends Model
{
    protected $table = 'student_profile';
    protected $primaryKey = 'student_profile_id';
    public $timestamps = false;
    protected $guarded = [];

    public function user()
    {
        return $this->belongsTo(SystemUser::class, 'user_id');
    }

    public function academicRecords()
    {
        return $this->hasMany(StudentAcademicRecord::class, 'student_profile_id');
    }

    public function documentRequests()
    {
        return $this->hasMany(DocumentRequest::class, 'student_profile_id');
    }
}
