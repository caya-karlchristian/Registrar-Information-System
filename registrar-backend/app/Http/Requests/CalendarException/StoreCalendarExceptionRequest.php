<?php

namespace App\Http\Requests\CalendarException;

use App\Models\BusinessCalendarHoliday;
use Illuminate\Foundation\Http\FormRequest;

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
        return [
            'calendar_id' => 'nullable|integer|exists:business_calendars,calendar_id',
            'type'        => 'required|string|in:'.implode(',', BusinessCalendarHoliday::TYPES),
            'label'       => 'required|string|max:255',
            'date'        => 'required|date',
            'end_date'    => 'nullable|date|after_or_equal:date',
            // 'H:i' (e.g. "15:00") to match the frontend's <input type="time">.
            // Whether this is actually *after* the day's normal opening
            // time is checked in CalendarExceptionService, not here — that
            // needs the calendar's weekly_hours, which a FormRequest has
            // no business reaching into.
            'closed_from_time' => 'nullable|date_format:H:i',
        ];
    }
}