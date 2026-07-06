<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class StudentAcademicRecord extends Model
{
    use HasFactory;
    protected $table = 'student_academic_record';
    protected $primaryKey = 'student_academic_id';
    public $timestamps = false;
    // course_id is set internally by OgosStudentService::upsertLocalRecords()
    // via updateOrCreate(), not through StudentAcademicRecordController's
    // validated input — must stay fillable or that sync silently breaks.
    protected $fillable = ['student_profile_id', 'student_number', 'course_id', 'course', 'year_level', 'section', 'school_year_admitted', 'last_school_year_attended'];

    public function studentProfile()
    {
        return $this->belongsTo(StudentProfile::class, 'student_profile_id');
    }

    public function documentRequests()
    {
        return $this->hasMany(DocumentRequest::class, 'student_academic_id');
    }
}
