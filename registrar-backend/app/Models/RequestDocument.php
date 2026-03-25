<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class RequestDocument extends Model
{
    protected $table      = 'request_document';
    protected $primaryKey = 'request_document_id';
    public    $timestamps = false;
    protected $guarded    = [];

    // number_of_copies is now per line item (per document type)
    // cap of 1–10 enforced at DB level via CHECK constraint
    protected $casts = [
        'number_of_copies' => 'integer',
    ];

    public function documentRequest()
    {
        return $this->belongsTo(DocumentRequest::class, 'request_id');
    }

    public function documentType()
    {
        return $this->belongsTo(DocumentType::class, 'document_type_id');
    }
}
