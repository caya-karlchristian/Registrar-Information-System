<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AlumniType extends Model
{
    public $timestamps = false;
    protected $primaryKey = 'alumni_type_id';
    protected $guarded = [];
    protected $table = 'alumni_type';

    public function alumni()
    {
        return $this->hasMany(Alumni::class, 'alumni_type_id', 'alumni_type_id');
    }
}
