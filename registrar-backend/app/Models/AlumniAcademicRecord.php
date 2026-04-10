<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AlumniAcademicRecord extends Model
{
    public $timestamps = false;
    protected $primaryKey = 'alumni_academic_id';
    protected $guarded = [];
    protected $table = 'alumni_academic_record';

    public function alumniProfile()
    {
        return $this->belongsTo(AlumniProfile::class, 'alumni_profile_id', 'alumni_profile_id');
    }
}