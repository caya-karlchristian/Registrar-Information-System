<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class RequestCertificate extends Model
{
    protected $table      = 'request_certificate';
    protected $primaryKey = 'request_certificate_id';
    public    $timestamps = false;
    protected $guarded    = [];

    // status_id: added by migration 2026_08_29_000007_add_status_to_
    // request_line_items — see RequestDocument's matching comment and
    // RequestItemStatusService, which owns every write to this column.
    protected $casts = [
        'status_id' => 'integer',
        'request_release_group_id' => 'integer',
    ];

    public function documentRequest()
    {
        return $this->belongsTo(DocumentRequest::class, 'request_id');
    }

    public function certificationType()
    {
        return $this->belongsTo(CertificationType::class, 'certificate_type_id');
    }

    public function status()
    {
        return $this->belongsTo(RequestStatus::class, 'status_id');
    }

    // See RequestDocument::releaseGroup() — identical convention.
    public function releaseGroup()
    {
        return $this->belongsTo(RequestReleaseGroup::class, 'request_release_group_id');
    }
}