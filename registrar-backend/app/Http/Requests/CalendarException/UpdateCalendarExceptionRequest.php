<?php

namespace App\Http\Requests\CalendarException;

use App\Models\BusinessCalendarHoliday;
use Illuminate\Foundation\Http\FormRequest;

class UpdateCalendarExceptionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'type'     => 'sometimes|required|string|in:'.implode(',', BusinessCalendarHoliday::TYPES),
            'label'    => 'sometimes|required|string|max:255',
            'date'     => 'sometimes|required|date',
            'end_date' => 'nullable|date|after_or_equal:date',
        ];
    }
}
