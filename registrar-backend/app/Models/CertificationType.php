<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class CertificationType extends Model
{
    //certificate_type 
    protected $table = 'certification_types';
    protected $primaryKey = 'cert_type_id';
    public $timestamps = false;
    protected $guarded = [];

    public function documentRequests()
    {
        return $this->hasMany(DocumentRequest::class, 'cert_type_id');
    }
}
