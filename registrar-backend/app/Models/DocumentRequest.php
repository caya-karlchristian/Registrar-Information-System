<?php

namespace App\Models;

use App\Models\Scopes\ExcludeArchivedScope;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class DocumentRequest extends Model
{
    use HasFactory;
    use SoftDeletes;

    protected $table      = 'document_request';
    protected $primaryKey = 'request_id';
    public    $timestamps = false;

    protected $fillable = [
        'user_id',
        'status_id',
        'request_purpose_id',
        'or_number',
        'receipt_date',
        'requested_at',
        'student_profile_id',
        'student_academic_id',
        'alumni_profile_id',
        'alumni_academic_id',
        'is_archived',
        'archived_on',
        'archived_by',
        'restored_on',
        'restored_by',
    ];

    protected $casts = [
        'requested_at' => 'datetime',
        'receipt_date' => 'date',
        'deleted_at'   => 'datetime',
        'is_archived'  => 'boolean',
        'archived_on'  => 'datetime',
        'restored_on'  => 'datetime',
    ];

    /**
     * Alphabet for claim_code: Crockford-style, excludes 0/O and 1/I/L
     * so a code read aloud at the counter or hand-typed by staff can't
     * be misheard/mistyped into a different valid-looking code.
     */
    private const CLAIM_CODE_ALPHABET = '23456789ABCDEFGHJKMNPQRSTVWXYZ';
    private const CLAIM_CODE_LENGTH   = 6;

    /**
     * Auto-generate a UUID for every new request.
     * The uuid is exposed in the UI instead of the integer PK
     * to avoid leaking record counts and enabling enumeration.
     *
     * Also generates claim_code — the short human-typeable fallback used
     * when a student has no phone or the QR scan fails (see QR Code
     * Claiming Policy v1.0, and the claim_code migration docblock for the
     * full reasoning). Generated the same way as uuid: on creating(),
     * only if not already set, so factories/seeders can still override it.
     *
     * Also registers ExcludeArchivedScope so archived requests are
     * invisible to every query by default — see the scope's docblock
     * for why this is a global scope rather than a per-call-site filter.
     */
    protected static function booted(): void
    {
        static::creating(function (DocumentRequest $request) {
            if (empty($request->uuid)) {
                $request->uuid = (string) Str::uuid();
            }

            if (empty($request->claim_code)) {
                $request->claim_code = static::generateUniqueClaimCode();
            }
        });

        static::addGlobalScope(new ExcludeArchivedScope());
    }

    /**
     * Generate a claim_code guaranteed unique against existing rows.
     *
     * The alphabet + length give ~729M possible codes, so collisions are
     * extremely unlikely — but correctness shouldn't rely on probability
     * alone, hence the existence check rather than a bare random draw.
     * withArchived()/withTrashed() are used so a code can never collide
     * with an archived or soft-deleted request either.
     */
    private static function generateUniqueClaimCode(): string
    {
        $alphabetLength = strlen(self::CLAIM_CODE_ALPHABET);

        do {
            $code = '';
            for ($i = 0; $i < self::CLAIM_CODE_LENGTH; $i++) {
                $code .= self::CLAIM_CODE_ALPHABET[random_int(0, $alphabetLength - 1)];
            }
        } while (
            static::withArchived()->withTrashed()->where('claim_code', $code)->exists()
        );

        return $code;
    }

    public function user()
    {
        return $this->belongsTo(SystemUser::class, 'user_id');
    }

    public function studentProfile()
    {
        return $this->belongsTo(StudentProfile::class, 'student_profile_id');
    }

    public function academicRecord()
    {
        return $this->belongsTo(StudentAcademicRecord::class, 'student_academic_id');
    }

    public function alumniProfile()
    {
        return $this->belongsTo(AlumniProfile::class, 'alumni_profile_id');
    }

    public function alumniAcademicRecord()
    {
        return $this->belongsTo(AlumniAcademicRecord::class, 'alumni_academic_id');
    }

    public function status()
    {
        return $this->belongsTo(RequestStatus::class, 'status_id');
    }

    public function requestPurpose()
    {
        return $this->belongsTo(RequestPurpose::class, 'request_purpose_id');
    }

    public function documents()
    {
        return $this->hasMany(RequestDocument::class, 'request_id');
    }

    public function certificates()
    {
        return $this->hasMany(RequestCertificate::class, 'request_id');
    }

    public function history()
    {
        return $this->hasMany(RequestHistory::class, 'request_id');
    }

    public function notifications()
    {
        return $this->hasMany(Notification::class, 'request_id');
    }

    // Named archivedByUser() (not archivedBy()) so it serializes to
    // "archived_by_user" — "archived_by" is already the raw FK column,
    // and Eloquent's relationsToArray() overwrites same-named attributes
    // when a relation is loaded. Same reasoning as AuditLog::targetUser()
    // vs. its target_user_id column.
    public function archivedByUser()
    {
        return $this->belongsTo(SystemUser::class, 'archived_by', 'user_id');
    }

    // Same "*ByUser" naming rationale as archivedByUser() above —
    // "restored_by" is the raw FK column, "restoredByUser" is the relation.
    public function restoredByUser()
    {
        return $this->belongsTo(SystemUser::class, 'restored_by', 'user_id');
    }
}