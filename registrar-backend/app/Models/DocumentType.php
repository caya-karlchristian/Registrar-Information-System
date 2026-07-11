<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class DocumentType extends Model
{
    protected $table = 'document_type';
    protected $primaryKey = 'document_type_id';
    public $timestamps = false;
    protected $fillable = ['document_name', 'document_description', 'document_requirements', 'document_process_period', 'access_id', 'cashier_document_patterns', 'is_archived', 'archived_on'];

    protected $casts = [
        'cashier_document_patterns' => 'array',
        'is_archived'                => 'boolean',
        'archived_on'                => 'datetime',
    ];

    public function requestDocuments()
    {
        return $this->hasMany(RequestDocument::class, 'document_type_id');
    }

    public function accessType()
    {
        return $this->belongsTo(AccessType::class, 'access_id');
    }
}