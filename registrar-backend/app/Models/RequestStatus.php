<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class RequestStatus extends Model
{
    protected $table = 'request_status';
    protected $primaryKey = 'status_id';
    public $timestamps = false;
    protected $guarded = [];

    public function documentRequests()
    {
        return $this->hasMany(DocumentRequest::class, 'status_id');
    }
}
