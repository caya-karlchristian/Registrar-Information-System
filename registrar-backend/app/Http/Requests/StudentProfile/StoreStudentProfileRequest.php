<?php

namespace App\Http\Requests\StudentProfile;

use Illuminate\Foundation\Http\FormRequest;

class StoreStudentProfileRequest extends FormRequest
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
            'user_id'       => 'required|integer|exists:users,user_id',
            'first_name'    => 'required|string|max:100',
            'middle_name'   => 'nullable|string|max:100',
            'last_name'     => 'required|string|max:100',
            'date_of_birth' => 'required|date',
            // permanent_address / contact_number intentionally excluded —
            // no such columns exist on student_profile (confirmed via
            // SHOW CREATE TABLE). Both were previously marked 'required',
            // so this endpoint 500'd on every call: validation always
            // passed (fields were present) and create() always failed
            // with a fatal "Unknown column" SQL error.
        ];
    }
}
