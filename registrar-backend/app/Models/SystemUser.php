<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SystemUser extends Model
{
    protected $table = 'system_user';
    protected $primaryKey = 'user_id';
    public $timestamps = false;
    protected $guarded = [];

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
