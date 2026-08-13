<?php

namespace App\Http\Requests\CalendarOverride;

use Illuminate\Foundation\Http\FormRequest;

class StoreCalendarOverrideRequest extends FormRequest
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
            'calendar_id'      => 'nullable|integer|exists:business_calendars,calendar_id',
            'day_of_week'      => 'required|string|in:monday,tuesday,wednesday,thursday,friday,saturday,sunday',
            'is_closed'        => 'sometimes|boolean',
            'label'            => 'required|string|max:255',
            'effective_from'   => 'required|date',
            'effective_until'  => 'nullable|date|after_or_equal:effective_from',
        ];
    }
}
