<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Announcement extends Model
{
    protected $fillable = [
        'title',
        'content',
        'enabled',
        'created_by',
    ];

    protected $casts = [
        'enabled' => 'boolean',
    ];

    public function creator()
    {
        return $this->belongsTo(SystemUser::class, 'created_by', 'user_id');
    }
}
