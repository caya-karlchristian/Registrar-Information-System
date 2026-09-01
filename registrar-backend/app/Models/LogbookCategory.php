<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class LogbookCategory extends Model
{
    protected $table = 'logbook_category';
    protected $primaryKey = 'logbook_category_id';

    protected $fillable = ['name'];

    public function documentTypes()
    {
        return $this->hasMany(DocumentType::class, 'logbook_category_id');
    }

    public function certificateTypes()
    {
        return $this->hasMany(CertificationType::class, 'logbook_category_id');
    }
}
