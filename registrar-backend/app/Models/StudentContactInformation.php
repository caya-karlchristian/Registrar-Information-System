<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class StudentContactInformation extends Model
{
    protected $table = 'student_contact_information';
    protected $primaryKey = 'student_contact_id';
    public $timestamps = false;

    // Populated from OgosStudentDTO on every login — see
    // OgosStudentService::syncContactInformation().
    protected $fillable = ['student_profile_id', 'mobile_number', 'personal_email_address'];

    public function studentProfile()
    {
        return $this->belongsTo(StudentProfile::class, 'student_profile_id');
    }
}
