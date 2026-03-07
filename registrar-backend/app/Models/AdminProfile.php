<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AdminProfile extends Model
{
    public $timestamps = false;
    protected $primaryKey = 'admin_profile_id';
    protected $guarded = [];

    public function user()
    {
        return $this->belongsTo(SystemUser::class, 'user_id', 'user_id');
    }
}
