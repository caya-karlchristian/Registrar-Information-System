<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * A one-off dated closure for a calendar — a declared holiday, a
 * suspension, or a one-off event (fumigation, team-building). All three
 * behave identically for SLA purposes (the calendar is fully closed for
 * every date in [date, end_date]); `type` exists purely so the admin UI
 * and the public status banner can label/filter them differently.
 *
 * @property \Illuminate\Support\Carbon $date      Start of the closure (inclusive)
 * @property \Illuminate\Support\Carbon $end_date  End of the closure (inclusive) — equals $date for a single day
 */
class BusinessCalendarHoliday extends Model
{
    protected $table = 'business_calendar_holidays';
    protected $primaryKey = 'holiday_id';

    public const TYPE_HOLIDAY    = 'holiday';
    public const TYPE_SUSPENSION = 'suspension';
    public const TYPE_EVENT      = 'event';

    public const TYPES = [self::TYPE_HOLIDAY, self::TYPE_SUSPENSION, self::TYPE_EVENT];

    protected $fillable = [
        'calendar_id',
        'date',
        'end_date',
        'type',
        'label',
    ];

    protected $casts = [
        'date'       => 'date',
        'end_date'   => 'date',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    public function calendar()
    {
        return $this->belongsTo(BusinessCalendar::class, 'calendar_id', 'calendar_id');
    }

    /**
     * Whether this closure covers the given local calendar date.
     * $date may be a Carbon instance or anything Carbon::parse() accepts.
     */
    public function coversDate($date): bool
    {
        $day = \Illuminate\Support\Carbon::parse($date)->startOfDay();
        $end = $this->end_date ?? $this->date;

        return $day->greaterThanOrEqualTo($this->date->clone()->startOfDay())
            && $day->lessThanOrEqualTo($end->clone()->startOfDay());
    }
}