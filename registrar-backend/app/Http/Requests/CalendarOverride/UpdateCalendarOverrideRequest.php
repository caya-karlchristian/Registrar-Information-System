<?php

namespace App\Http\Requests\CalendarOverride;

use Illuminate\Foundation\Http\FormRequest;

class UpdateCalendarOverrideRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'day_of_week'      => 'sometimes|required|string|in:monday,tuesday,wednesday,thursday,friday,saturday,sunday',
            'is_closed'        => 'sometimes|boolean',
            'label'            => 'sometimes|required|string|max:255',
            'effective_from'   => 'sometimes|required|date',
            'effective_until'  => 'nullable|date|after_or_equal:effective_from',
            'enabled'          => 'sometimes|boolean',
        ];
    }
}