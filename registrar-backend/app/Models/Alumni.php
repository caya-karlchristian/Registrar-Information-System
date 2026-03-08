<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Alumni extends Model
{
    public $timestamps = false;
    protected $primaryKey = 'alumni_id';
    protected $guarded = [];

    // -------------------------------------------------------
    // Alumni belongs to a user account
    // -------------------------------------------------------
    public function user()
    {
        return $this->belongsTo(SystemUser::class, 'user_id', 'user_id');
    }

    // -------------------------------------------------------
    // Alumni has one profile (name, dob, etc.)
    // -------------------------------------------------------
    public function profile()
    {
        return $this->hasOne(AlumniProfile::class, 'alumni_id', 'alumni_id');
    }

    // -------------------------------------------------------
    // Alumni belongs to a type (SIS or NON-SIS)
    // -------------------------------------------------------
    public function alumniType()
    {
        return $this->belongsTo(AlumniType::class, 'alumni_type_id', 'alumni_type_id');
    }
}
