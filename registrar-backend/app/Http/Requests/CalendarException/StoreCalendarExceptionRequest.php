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
            'closed_from_time.after_or_equal'  => 'Closes-early time can\'t be earlier than 8:00 AM.',
            'closed_from_time.before_or_equal' => 'Closes-early time can\'t be later than 8:00 PM.',
        ];
    }
}