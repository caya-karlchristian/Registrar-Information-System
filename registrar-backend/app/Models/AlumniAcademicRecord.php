<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AlumniAcademicRecord extends Model
{
    public $timestamps = false;
    protected $primaryKey = 'alumni_academic_id';
    // Not currently written to anywhere in the app — fillable set to the
    // real schema columns (minus PK) as a safe default for whenever this
    // gets wired up, rather than leaving mass assignment fully open.
    protected $fillable = ['alumni_profile_id', 'student_number', 'maiden_name', 'year_of_graduation', 'course'];
    protected $table = 'alumni_academic_record';

    public function alumniProfile()
    {
        return $this->belongsTo(AlumniProfile::class, 'alumni_profile_id', 'alumni_profile_id');
    }
}