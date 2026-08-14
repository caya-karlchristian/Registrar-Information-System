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
            // 'sometimes' + 'nullable' (not just 'nullable') so the key's
            // presence vs. absence survives into validated(): omitted
            // entirely -> key absent -> "leave it alone"; sent as
            // null -> key present with a null value -> "clear the cutoff,
            // back to a full-day closure." CalendarExceptionService tells
            // these apart with array_key_exists(), same as end_date above.
            'closed_from_time' => 'sometimes|nullable|date_format:H:i',
            'enabled'  => 'sometimes|boolean',
        ];
    }
}