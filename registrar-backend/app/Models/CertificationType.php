<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Storage;

class CertificationType extends Model
{
    //certificate_type 
    protected $table = 'certificate_type';
    protected $primaryKey = 'certificate_type_id';
    protected $keyType = 'int';
    public $incrementing = true;
    public $timestamps = false;
    protected $guarded = [];

    // layout_footer_urls is stored as a JSON array of bare paths.
    // Do NOT add it to $casts here — the accessor below handles decoding
    // and URL resolution in one step.

    // -----------------------------------------------------------------------
    // Accessors — resolve bare storage paths → full URLs at read-time.
    // Storing only the path (not an absolute URL) means the same DB row
    // works correctly in every environment: local, staging, production, S3.
    // Storage::url() reads APP_URL at runtime, so the host is always right.
    // -----------------------------------------------------------------------

    protected function layoutHeaderLeftUrl(): Attribute
    {
        return Attribute::make(
            get: fn ($value) => $value ? Storage::url($value) : null,
        );
    }

    protected function layoutHeaderRightUrl(): Attribute
    {
        return Attribute::make(
            get: fn ($value) => $value ? Storage::url($value) : null,
        );
    }

    /**
     * layout_footer_urls is a JSON array of bare paths in the DB.
     * On get:  decode JSON, map each path through Storage::url().
     * On set:  accept an array of paths and JSON-encode it for storage.
     *          The setter is here so ->update(['layout_footer_urls' => [...]])
     *          works transparently without callers needing to json_encode.
     */
    protected function layoutFooterUrls(): Attribute
    {
        return Attribute::make(
            get: function ($value) {
                $paths = json_decode($value ?? '[]', true) ?? [];
                return array_values(array_map(
                    fn ($path) => Storage::url($path),
                    array_filter($paths, fn ($p) => is_string($p) && trim($p) !== '')
                ));
            },
            set: fn ($value) => json_encode(array_values($value ?? [])),
        );
    }

    public function documentRequests()
    {
        return $this->hasMany(DocumentRequest::class, 'cert_type_id');
    }
}
