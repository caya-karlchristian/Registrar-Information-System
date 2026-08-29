<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

/**
 * A separate claim ticket (own uuid/claim_code) covering a subset of one
 * document_request's line items — the ones sharing a given
 * fulfillment_track. Only created when a request's items actually span
 * more than one distinct track; see RequestReleaseGroupService::
 * assignReleaseGroups(). Most requests never have any of these rows.
 *
 * status_id is this group's own "earliest-stage-wins" aggregate over just
 * its member items — same computation RequestItemStatusService already
 * does for document_request.status_id, scoped narrower. Claiming this
 * group (scanning ITS uuid/claim_code, not the request's) transitions
 * only its member items to Completed — see RequestReleaseGroupService::
 * claimReleaseGroup().
 */
class RequestReleaseGroup extends Model
{
    protected $table      = 'request_release_group';
    protected $primaryKey = 'request_release_group_id';
    public    $timestamps = false;

    protected $fillable = [
        'request_id',
        'fulfillment_track_id',
        'status_id',
        'uuid',
        'claim_code',
    ];

    protected $casts = [
        'created_at' => 'datetime',
    ];

    /**
     * Same alphabet/length/uniqueness scheme as DocumentRequest::
     * generateUniqueClaimCode() — kept as an independent copy rather
     * than a shared helper, since the uniqueness check needs to run
     * against THIS table, not document_request's.
     */
    private const CLAIM_CODE_ALPHABET = '23456789ABCDEFGHJKMNPQRSTVWXYZ';
    private const CLAIM_CODE_LENGTH   = 6;

    protected static function booted(): void
    {
        static::creating(function (RequestReleaseGroup $group) {
            if (empty($group->uuid)) {
                $group->uuid = (string) Str::uuid();
            }

            if (empty($group->claim_code)) {
                $group->claim_code = static::generateUniqueClaimCode();
            }
        });
    }

    private static function generateUniqueClaimCode(): string
    {
        $alphabetLength = strlen(self::CLAIM_CODE_ALPHABET);

        do {
            $code = '';
            for ($i = 0; $i < self::CLAIM_CODE_LENGTH; $i++) {
                $code .= self::CLAIM_CODE_ALPHABET[random_int(0, $alphabetLength - 1)];
            }
        } while (static::where('claim_code', $code)->exists());

        return $code;
    }

    public function documentRequest()
    {
        return $this->belongsTo(DocumentRequest::class, 'request_id');
    }

    public function fulfillmentTrack()
    {
        return $this->belongsTo(FulfillmentTrack::class, 'fulfillment_track_id');
    }

    public function status()
    {
        return $this->belongsTo(RequestStatus::class, 'status_id');
    }

    public function documents()
    {
        return $this->hasMany(RequestDocument::class, 'request_release_group_id');
    }

    public function certificates()
    {
        return $this->hasMany(RequestCertificate::class, 'request_release_group_id');
    }
}
