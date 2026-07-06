<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AccessType extends Model
{
    protected $table = 'access_type';
    protected $primaryKey = 'access_id';
    public $timestamps = false;

    // Seeded, effectively static reference data (1=student, 2=alumni, 3=both
    // — see DatabaseSeeder::seedDocumentTypes()'s note on access_type).
    // Guarded rather than open, since nothing in the app currently writes to
    // this table — if that changes, tighten $guarded to the real fillable set.
    protected $guarded = ['access_id'];

    public function documentTypes()
    {
        return $this->hasMany(DocumentType::class, 'access_id');
    }

    public function certificateTypes()
    {
        return $this->hasMany(CertificationType::class, 'access_id');
    }
}
