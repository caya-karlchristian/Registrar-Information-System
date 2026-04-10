<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class RequestCertificate extends Model
{
    protected $table      = 'request_certificate';
    protected $primaryKey = 'request_certificate_id';
    public    $timestamps = false;
    protected $guarded    = [];

    public function documentRequest()
    {
        return $this->belongsTo(DocumentRequest::class, 'request_id');
    }

    public function certificationType()
    {
        return $this->belongsTo(CertificationType::class, 'certificate_type_id');
    }
}
