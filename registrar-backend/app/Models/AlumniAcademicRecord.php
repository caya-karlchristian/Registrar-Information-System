<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AlumniAcademicRecord extends Model
{
    public $timestamps = false;
    protected $primaryKey = 'alumni_academic_id';
    // Written by App\Services\Alumni\AlumniProvisioningService on every
    // alumni SSO login (updateOrCreate keyed on alumni_profile_id).
    // Fillable is scoped to the real schema columns (minus PK) rather
    // than left fully open.
    protected $fillable = ['alumni_profile_id', 'student_number', 'maiden_name', 'year_of_graduation', 'course'];
    protected $table = 'alumni_academic_record';

    public function alumniProfile()
    {
        return $this->belongsTo(AlumniProfile::class, 'alumni_profile_id', 'alumni_profile_id');
    }
}