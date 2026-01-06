<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class RequestStatus extends Model
{
    protected $table = 'request_status';
    protected $primaryKey = 'status_id';
    public $timestamps = false;
}
