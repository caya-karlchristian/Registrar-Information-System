<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AlumniAcademicRecord extends Model
{
    public $timestamps = false;
    protected $primaryKey = 'alumni_academic_id';
    // Written by App\Services\Alumni\AlumniProvisioningService on every
    // alumni SSO login (updateOrCreate keyed on alumni_profile_id).
    // Fillable is scoped to the real schema columns (minus PK) rather
    // than left fully open.
    protected $fillable = ['alumni_profile_id', 'student_number', 'maiden_name', 'year_of_graduation', 'course'];
    protected $table = 'alumni_academic_record';

    // year_of_graduation is a MySQL YEAR column. AlumniProvisioningService::
    // resolveYearOfGraduation() always writes it as a real int, but without
    // an explicit cast here, the value comes back however the underlying
    // driver returns it — a string on the sqlite driver used in tests
    // (DB_CONNECTION=sqlite in phpunit.xml), possibly a string on MySQL too
    // depending on PDO fetch mode. Cast it explicitly so callers always get
    // an int regardless of driver.
    protected $casts = [
        'year_of_graduation' => 'integer',
    ];

    public function alumniProfile()
    {
        return $this->belongsTo(AlumniProfile::class, 'alumni_profile_id', 'alumni_profile_id');
    }
}