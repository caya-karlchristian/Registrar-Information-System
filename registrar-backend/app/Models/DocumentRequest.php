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
    ];

    protected $casts = [
        'requested_at' => 'datetime',
        'receipt_date' => 'date',
        'deleted_at'   => 'datetime',
        'is_archived'  => 'boolean',
        'archived_on'  => 'datetime',
    ];

    /**
     * Auto-generate a UUID for every new request.
     * The uuid is exposed in the UI instead of the integer PK
     * to avoid leaking record counts and enabling enumeration.
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
        });

        static::addGlobalScope(new ExcludeArchivedScope());
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
}