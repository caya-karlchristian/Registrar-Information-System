<?php

namespace App\Http\Requests\CalendarException;

use App\Models\BusinessCalendarHoliday;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Carbon;

class StoreCalendarExceptionRequest extends FormRequest
{
    public function authorize(): bool
    {
        // Route sits behind ['role:3,4', 'module:business_calendar'] in
        // routes/api.php — no per-request Policy check needed here.
        return true;
    }

    public function rules(): array
    {
        // Computed in the app's *display* timezone (config('app.display_timezone'),
        // e.g. Asia/Manila) — not PHP's default (config('app.timezone') is
        // 'UTC', used only for storage). Using UTC "today" here would let a
        // truly-past local date slip through, or reject a valid same-day
        // entry, whenever the two timezones disagree on what day it is.
        // Same convention as BusinessCalendarService/AnalyticsService for
        // every other calendar-day boundary in this codebase.
        $today = Carbon::now(config('app.display_timezone', 'Asia/Manila'))->toDateString();

        return [
            'calendar_id' => 'nullable|integer|exists:business_calendars,calendar_id',
            'type'        => 'required|string|in:'.implode(',', BusinessCalendarHoliday::TYPES),
            'label'       => 'required|string|max:255',
            // A closure can be declared for today (e.g. an emergency
            // suspension announced the same morning) or any future date,
            // but never backdated — a "closure" that already happened
            // isn't something staff should be able to fabricate after
            // the fact. Scoped to creation only: editing an existing
            // closure's other fields (label, type, enabled) is handled
            // by UpdateCalendarExceptionRequest and intentionally does
            // NOT re-run this check, so legitimate historical entries
            // stay editable.
            'date'        => ['required', 'date', 'after_or_equal:'.$today],
            'end_date'    => 'nullable|date|after_or_equal:date',
            // 'H:i' (e.g. "15:00") to match the frontend's <input type="time">.
            // Registrar closes-early times are restricted to the 8 AM–8 PM
            // window regardless of calendar — a value outside normal
            // business hours is a data-entry mistake, not a real partial
            // closure. Whether the time is actually *after* the day's
            // normal opening time (a separate, calendar-specific check) is
            // done in CalendarExceptionService, not here — that needs the
            // calendar's weekly_hours, which a FormRequest has no business
            // reaching into.
            'closed_from_time' => 'nullable|date_format:H:i|after_or_equal:08:00|before_or_equal:20:00',
        ];
    }

    public function messages(): array
    {
        return [
            'date.after_or_equal'              => 'Closure date can\'t be in the past.',
            'closed_from_time.after_or_equal'  => 'Closes-early time can\'t be earlier than 8:00 AM.',
            'closed_from_time.before_or_equal' => 'Closes-early time can\'t be later than 8:00 PM.',
        ];
    }
}