<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * A claiming-grouping label for document_type/certificate_type rows —
 * see migration 2026_08_29_000008_add_fulfillment_tracks_and_release_groups
 * for the full reasoning. Same plain-lookup shape as AccessType and
 * LogbookCategory: rows are added/renamed via an admin screen, never a
 * migration.
 *
 * NULL fulfillment_track_id on a document_type/certificate_type row means
 * "the implicit standard track" — most rows won't have an explicit row
 * here assigned at all.
 */
class FulfillmentTrack extends Model
{
    protected $table      = 'fulfillment_track';
    protected $primaryKey = 'fulfillment_track_id';
    protected $fillable   = ['name'];

    public function documentTypes()
    {
        return $this->hasMany(DocumentType::class, 'fulfillment_track_id');
    }

    public function certificationTypes()
    {
        return $this->hasMany(CertificationType::class, 'fulfillment_track_id');
    }
}
