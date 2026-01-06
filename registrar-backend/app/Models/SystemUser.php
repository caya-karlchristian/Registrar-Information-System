<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SystemUser extends Model
{
    protected $table = 'system_user';
    protected $primaryKey = 'user_id';
    public $timestamps = false;
}
