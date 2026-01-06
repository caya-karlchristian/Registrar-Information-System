<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class StudentAcademicRecord extends Model
{
    protected $table = 'student_academic_record';
    protected $primaryKey = 'academic_record_id';
    public $timestamps = false;

    protected $fillable = [
        'student_profile_id','student_number','course','year_level',
        'school_year_admitted','last_school_year_attended',
        'has_honorable_dismissal','graduation_date'
    ];
}
