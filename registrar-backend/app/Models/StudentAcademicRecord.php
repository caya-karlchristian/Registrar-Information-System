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
