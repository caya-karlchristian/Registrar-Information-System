<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AlumniProfile extends Model
{
    public $timestamps = false;
    protected $primaryKey = 'alumni_profile_id';
    protected $fillable = ['alumni_id', 'first_name', 'middle_name', 'last_name', 'suffix', 'date_of_birth', 'place_of_birth', 'sex_at_birth'];
     protected $table = 'alumni_profile';

    // -------------------------------------------------------
    // Profile belongs to an alumni record
    // -------------------------------------------------------
    public function alumni()
    {
        return $this->belongsTo(Alumni::class, 'alumni_id', 'alumni_id');
    }
    
    public function academicRecord()
    {
        return $this->hasOne(AlumniAcademicRecord::class, 'alumni_profile_id', 'alumni_profile_id');
    }
}
