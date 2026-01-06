<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class DocumentType extends Model
{
    protected $table = 'document_type';
    protected $primaryKey = 'document_type_id';
    public $timestamps = false;
    protected $guarded = [];

    public function requestDocuments()
    {
        return $this->hasMany(RequestDocument::class, 'document_type_id');
    }
}
