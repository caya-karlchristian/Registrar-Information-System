<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class RequestHistory extends Model
{
    protected $table = 'request_history';
    protected $primaryKey = 'history_id';
    public $timestamps = false;
    protected $guarded = [];

    public function request()
    {
        return $this->belongsTo(DocumentRequest::class, 'request_id');
    }

    public function oldStatus()
    {
        return $this->belongsTo(RequestStatus::class, 'old_status_id');
    }

    public function newStatus()
    {
        return $this->belongsTo(RequestStatus::class, 'new_status_id');
    }

    public function changedBy()
    {
        return $this->belongsTo(SystemUser::class, 'changed_by');
    }
}
