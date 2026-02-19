<?php

namespace App\Models;

use Illuminate\Foundation\Auth\User as Authenticatable;
use Laravel\Sanctum\HasApiTokens;

class SystemUser extends Authenticatable
{
    use HasApiTokens;

    protected $table = 'system_user';
    protected $primaryKey = 'user_id';
    public $timestamps = false;

    protected $fillable = [
        'name',
        'email',
        'password'
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    public function studentProfile()
    {
        return $this->hasOne(StudentProfile::class, 'user_id');
    }

    public function documentRequests()
    {
        return $this->hasMany(DocumentRequest::class, 'user_id');
    }

    public function changedRequests()
    {
        return $this->hasMany(RequestHistory::class, 'changed_by');
    }
}
