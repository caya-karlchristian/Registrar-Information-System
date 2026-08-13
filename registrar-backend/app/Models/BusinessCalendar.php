<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * A named weekly-hours schedule (plus its holiday exceptions) that a clock
 * can be measured against. See BusinessCalendarService for how this is
 * turned into elapsed "business minutes" between two instants.
 *
 * @property array<string, array{open:string, close:string}|null> $weekly_hours
 */
class BusinessCalendar extends Model
{
    protected $table = 'business_calendars';
    protected $primaryKey = 'calendar_id';

    protected $fillable = [
        'name',
        'is_default',
        'weekly_hours',
    ];

    protected $casts = [
        'is_default'   => 'boolean',
        'weekly_hours' => 'array',
        'created_at'   => 'datetime',
        'updated_at'   => 'datetime',
    ];

    public function holidays()
    {
        return $this->hasMany(BusinessCalendarHoliday::class, 'calendar_id', 'calendar_id');
    }

    public function overrides()
    {
        return $this->hasMany(BusinessCalendarOverride::class, 'calendar_id', 'calendar_id');
    }
}