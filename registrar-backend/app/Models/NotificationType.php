<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class NotificationType extends Model
{
    protected $table      = 'notification_types';
    protected $primaryKey = 'notification_type_id';
    public    $timestamps = true;

    protected $fillable = [
        'trigger_event',
        'title',
        'message_template',
        'audience',
        'is_active',
    ];

    // All notifications sent using this type
    public function notifications()
    {
        return $this->hasMany(Notification::class, 'notification_type_id');
    }
}
