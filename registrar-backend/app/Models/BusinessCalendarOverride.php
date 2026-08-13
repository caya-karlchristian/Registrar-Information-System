<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Carbon;

/**
 * A recurring, time-bound rule that overrides a calendar's normal
 * weekly_hours for one day of the week — e.g. "closed every Monday,
 * effective 2026-03-02, until further notice." See the migration
 * docblock for why this is a separate table from business_calendar_holidays
 * (one-off dated closures) rather than reusing it.
 *
 * @property \Illuminate\Support\Carbon $effective_from
 * @property \Illuminate\Support\Carbon|null $effective_until  null = indefinite
 */
class BusinessCalendarOverride extends Model
{
    protected $table = 'business_calendar_overrides';
    protected $primaryKey = 'override_id';

    protected $fillable = [
        'calendar_id',
        'day_of_week',
        'is_closed',
        'label',
        'effective_from',
        'effective_until',
    ];

    protected $casts = [
        'is_closed'       => 'boolean',
        'effective_from'  => 'date',
        'effective_until' => 'date',
        'created_at'      => 'datetime',
        'updated_at'      => 'datetime',
    ];

    public function calendar()
    {
        return $this->belongsTo(BusinessCalendar::class, 'calendar_id', 'calendar_id');
    }

    /**
     * Whether this override rule is in effect on the given local calendar
     * date — i.e. the weekday matches AND the date falls within
     * [effective_from, effective_until] (open-ended if effective_until is null).
     */
    public function appliesTo($date): bool
    {
        $day = Carbon::parse($date)->startOfDay();

        if (strtolower($day->format('l')) !== $this->day_of_week) {
            return false;
        }

        if ($day->lessThan($this->effective_from->clone()->startOfDay())) {
            return false;
        }

        if ($this->effective_until && $day->greaterThan($this->effective_until->clone()->startOfDay())) {
            return false;
        }

        return true;
    }
}
