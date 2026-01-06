<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class RequestDocument extends Model
{
    protected $table = 'request_document';
    protected $primaryKey = 'request_document_id';
    public $timestamps = false;
    protected $guarded = [];

    public function documentRequest()
    {
        return $this->belongsTo(DocumentRequest::class, 'request_id');
    }

    public function documentType()
    {
        return $this->belongsTo(DocumentType::class, 'document_type_id');
    }
}
