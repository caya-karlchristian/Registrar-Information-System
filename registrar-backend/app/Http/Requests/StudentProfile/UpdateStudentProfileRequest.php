<?php

namespace App\Http\Requests\StudentProfile;

use Illuminate\Foundation\Http\FormRequest;

class UpdateStudentProfileRequest extends FormRequest
{
    public function authorize(): bool
    {
        // Route is registered via Route::apiResource('students', ...)
        // inside the 'role:3' group in routes/api.php — no per-request
        // Policy check needed here.
        return true;
    }

    public function rules(): array
    {
        return [
            'first_name'    => 'sometimes|string|max:100',
            'middle_name'   => 'nullable|string|max:100',
            'last_name'     => 'sometimes|string|max:100',
            'date_of_birth' => 'sometimes|date',
        ];
    }
}
