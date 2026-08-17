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
            // 'nullable' short-circuits the range rules below when the
            // value is null, so clearing the cutoff is unaffected by the
            // 8 AM–8 PM restriction — see the matching rule/comment in
            // StoreCalendarExceptionRequest.
            'closed_from_time' => 'sometimes|nullable|date_format:H:i|after_or_equal:08:00|before_or_equal:20:00',
            'enabled'  => 'sometimes|boolean',
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