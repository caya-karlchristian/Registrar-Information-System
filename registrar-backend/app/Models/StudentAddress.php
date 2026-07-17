<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class StudentAddress extends Model
{
    protected $table = 'student_addresses';
    protected $primaryKey = 'student_address_id';
    public $timestamps = false;

    // One row per (student_profile_id, address_type) — see
    // OgosStudentService::syncAddresses() and OgosAddressDTO.
    protected $fillable = [
        'student_profile_id', 'address_type',
        'street_detail', 'barangay_code', 'barangay_name',
        'city_code', 'city_name', 'province_code', 'province_name',
        'region_code', 'region_name', 'synced_at',
    ];

    protected $casts = [
        'synced_at' => 'datetime',
    ];

    public function studentProfile()
    {
        return $this->belongsTo(StudentProfile::class, 'student_profile_id');
    }
}
