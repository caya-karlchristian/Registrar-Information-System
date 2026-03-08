<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AlumniProfile extends Model
{
    public $timestamps = false;
    protected $primaryKey = 'alumni_profile_id';
    protected $guarded = [];
     protected $table = 'alumni_profile';

    // -------------------------------------------------------
    // Profile belongs to an alumni record
    // -------------------------------------------------------
    public function alumni()
    {
        return $this->belongsTo(Alumni::class, 'alumni_id', 'alumni_id');
    }
}
