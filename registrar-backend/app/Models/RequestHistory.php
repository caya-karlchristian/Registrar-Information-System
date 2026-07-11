<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class RequestHistory extends Model
{
    protected $table = 'request_history';
    protected $primaryKey = 'request_history_id';
    public $timestamps = false;

    // processed_by was dropped (see migration
    // 2026_07_08_000001_consolidate_request_history_actor) — changed_by is
    // now the single actor column, used for both manual admin changes
    // (DocumentRequestService) and automated ones (ShredExpiredRequests,
    // which passes null). processed_by_email still pairs with changed_by:
    // when changed_by is null, it's the only way to tell "automated
    // transition" (processed_by_email = 'system') apart from "the acting
    // user's account was later deleted" (processed_by_email = null too).
    protected $fillable = ['request_id', 'old_status_id', 'new_status_id', 'changed_at', 'changed_by', 'processed_by_email', 'minutes_processed'];

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