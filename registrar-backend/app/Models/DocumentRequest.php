<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class DocumentRequest extends Model
{
    protected $table = 'document_request';
    protected $primaryKey = 'request_id';
    public $timestamps = false;
    protected $guarded = [];

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
        return $this->belongsTo(StudentAcademicRecord::class, 'academic_record_id');
    }

    public function status()
    {
        return $this->belongsTo(RequestStatus::class, 'status_id');
    }

    public function documents()
    {
        return $this->hasMany(RequestDocument::class, 'request_id');
    }

    public function certificationType()
    {
        return $this->belongsTo(CertificationType::class, 'cert_type_id');
    }

    public function history()
    {
        return $this->hasMany(RequestHistory::class, 'request_id');
    }
}
