<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class StudentAcademicRecord extends Model
{
    protected $table = 'student_academic_record';
    protected $primaryKey = 'student_academic_id';
    public $timestamps = false;
    protected $guarded = [];

    public function studentProfile()
    {
        return $this->belongsTo(StudentProfile::class, 'student_profile_id');
    }

    public function documentRequests()
    {
        return $this->hasMany(DocumentRequest::class, 'student_academic_id');
    }
}
