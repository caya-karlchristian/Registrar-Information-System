<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class CertificationType extends Model
{
    //certificate_type 
    protected $table = 'certificate_type';
    protected $primaryKey = 'certificate_type_id';
    protected $keyType = 'int';
    public $incrementing = true;
    public $timestamps = false;
    protected $guarded = [];

    protected $casts = [
        'layout_footer_urls' => 'array',
    ];

    public function documentRequests()
    {
        return $this->hasMany(DocumentRequest::class, 'cert_type_id');
    }
}
