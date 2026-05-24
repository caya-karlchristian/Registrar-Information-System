<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class DocumentRequest extends Model
{
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
    ];

    protected $casts = [
        'requested_at' => 'datetime',
        'receipt_date' => 'date',
        'deleted_at'   => 'datetime',
    ];

    /**
     * Auto-generate a UUID for every new request.
     * The uuid is exposed in the UI instead of the integer PK
     * to avoid leaking record counts and enabling enumeration.
     */
    protected static function booted(): void
    {
        static::creating(function (DocumentRequest $request) {
            if (empty($request->uuid)) {
                $request->uuid = (string) Str::uuid();
            }
        });
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
}