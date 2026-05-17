<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Alumni extends Model
{
    public $timestamps = false;
    protected $primaryKey = 'alumni_id';
    protected $guarded = [];
    protected $table = 'alumni';

    const TYPE_SIS     = 1;  // fixed from 2
    const TYPE_NON_SIS = 2;

    // -------------------------------------------------------
    // Relationships
    // -------------------------------------------------------
    public function user()
    {
        return $this->belongsTo(SystemUser::class, 'user_id', 'user_id');
    }

    public function profile()
    {
        return $this->hasOne(AlumniProfile::class, 'alumni_id', 'alumni_id');
    }

    public function alumniType()
    {
        return $this->belongsTo(AlumniType::class, 'alumni_type_id', 'alumni_type_id');
    }

    public function academicRecord()
    {
        return $this->hasOneThrough(
            AlumniAcademicRecord::class,
            AlumniProfile::class,
            'alumni_id',        // FK on alumni_profile
            'alumni_profile_id', // FK on alumni_academic_record
            'alumni_id',        // local key on alumni
            'alumni_profile_id' // local key on alumni_profile
        );
    }

    // -------------------------------------------------------
    // Scopes
    // -------------------------------------------------------
    public function scopeSis($query)
    {
        return $query->where('alumni_type_id', self::TYPE_SIS);
    }

    public function scopeNonSis($query)
    {
        return $query->where('alumni_type_id', self::TYPE_NON_SIS);
    }

    // -------------------------------------------------------
    // Helpers
    // -------------------------------------------------------
    public function isSis(): bool
    {
        return (int) $this->alumni_type_id === self::TYPE_SIS;
    }

    public function isNonSis(): bool
    {
        return (int) $this->alumni_type_id === self::TYPE_NON_SIS;
    }
}