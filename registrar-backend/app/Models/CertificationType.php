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

    protected $casts = [
        'cashier_document_patterns' => 'array',
    ];

    // layout_footer_urls is stored as a JSON array of bare paths.
    // Do NOT add it to $casts here — the accessor below handles decoding
    // and URL resolution in one step.

    // -----------------------------------------------------------------------
    // Accessors — resolve storage paths → full URLs at read-time.
    //
    // Values in the DB can be either:
    //   (a) A full URL already (https://...) — stored by uploadLayoutLogo
    //       after the S3 migration; returned as-is.
    //   (b) A bare storage path (certification-layouts/1/header_left/file.png)
    //       — stored by older code or local-disk uploads; resolved via
    //       Storage::disk()->url() using the currently configured disk.
    //
    // This dual-mode handling ensures existing rows keep working after the
    // migration from local 'public' disk to S3.
    // -----------------------------------------------------------------------

    /**
     * Resolve a single stored value to a public URL.
     * Already-absolute URLs are passed through unchanged.
     */
    private function resolveStorageUrl(?string $value): ?string
    {
        if (!$value) {
            return null;
        }
        // Already a full URL (S3, CDN, or previous APP_URL-prefixed value).
        if (str_starts_with($value, 'http://') || str_starts_with($value, 'https://')) {
            return $value;
        }
        // Bare path — resolve through the currently configured disk.
        return Storage::disk(config('filesystems.default', 'public'))->url($value);
    }

    protected function layoutHeaderLeftUrl(): Attribute
    {
        return Attribute::make(
            get: fn ($value) => $this->resolveStorageUrl($value),
        );
    }

    protected function layoutHeaderRightUrl(): Attribute
    {
        return Attribute::make(
            get: fn ($value) => $this->resolveStorageUrl($value),
        );
    }

    /**
     * layout_footer_urls is a JSON array in the DB.
     * Each element can be a full URL or a bare path (see resolveStorageUrl).
     * On set: accept an array and JSON-encode it.
     */
    protected function layoutFooterUrls(): Attribute
    {
        return Attribute::make(
            get: function ($value) {
                $items = json_decode($value ?? '[]', true) ?? [];
                return array_values(array_filter(array_map(
                    fn ($item) => is_string($item) && trim($item) !== ''
                        ? $this->resolveStorageUrl($item)
                        : null,
                    $items
                )));
            },
            set: fn ($value) => json_encode(array_values($value ?? [])),
        );
    }

    public function documentRequests()
    {
        return $this->hasMany(DocumentRequest::class, 'cert_type_id');
    }
}