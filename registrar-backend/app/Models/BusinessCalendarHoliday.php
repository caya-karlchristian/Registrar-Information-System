<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class BusinessCalendarHoliday extends Model
{
    protected $table = 'business_calendar_holidays';
    protected $primaryKey = 'holiday_id';

    protected $fillable = [
        'calendar_id',
        'date',
        'label',
    ];

    protected $casts = [
        'date'       => 'date',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    public function calendar()
    {
        return $this->belongsTo(BusinessCalendar::class, 'calendar_id', 'calendar_id');
    }
}
