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
        'enabled',
    ];

    protected $casts = [
        'is_closed'       => 'boolean',
        'effective_from'  => 'date',
        'effective_until' => 'date',
        'enabled'         => 'boolean',
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
        // See BusinessCalendarHoliday::coversDate() for why this compares
        // Y-m-d strings rather than Carbon instants: $date arrives localized
        // to app.display_timezone (e.g. Asia/Manila) while effective_from/
        // effective_until are Eloquent 'date'-cast attributes instantiated
        // in app.timezone (UTC). Instant comparison silently shifts the
        // boundary by the UTC offset and produces an off-by-one-day bug.
        $day = Carbon::parse($date);

        if (strtolower($day->format('l')) !== $this->day_of_week) {
            return false;
        }

        $dayStr = $day->format('Y-m-d');

        if ($dayStr < $this->effective_from->format('Y-m-d')) {
            return false;
        }

        if ($this->effective_until && $dayStr > $this->effective_until->format('Y-m-d')) {
            return false;
        }

        return true;
    }
}