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
        ];
    }
}
