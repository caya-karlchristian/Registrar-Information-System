<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AdminProfile extends Model
{
    protected $table      = 'admin_profile';
    public    $timestamps = false;
    protected $primaryKey = 'admin_profile_id';

    protected $fillable = [
        'user_id',
        'first_name',
        'middle_name',
        'last_name',
        'suffix',
        // OCMS-sourced fields (added by migration add_ocms_fields_to_admin_profile)
        'office',
        'contact_no',
        'emergency_contact_person',
        'birthday',
        'gender',
        'civil_status',
        'address',
    ];

    public function user()
    {
        return $this->belongsTo(SystemUser::class, 'user_id', 'user_id');
    }
}
