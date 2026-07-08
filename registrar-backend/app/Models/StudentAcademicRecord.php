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
    //
    // `course` is a point-in-time snapshot of programs.name at the moment
    // course_id was set, NOT a live duplicate. It must never be accepted as
    // independent client input — both OgosStudentService and
    // StudentAcademicRecordController derive it from course_id/Program
    // lookup and pass it in alongside course_id. This is deliberate: if a
    // program is later renamed at the source (OGOS), existing records —
    // and any certificates already generated from them — should keep
    // showing the name as it was, not retroactively change.
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