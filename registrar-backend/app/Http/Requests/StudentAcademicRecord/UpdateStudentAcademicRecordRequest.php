<?php

namespace App\Http\Requests\StudentAcademicRecord;

use Illuminate\Foundation\Http\FormRequest;

class UpdateStudentAcademicRecordRequest extends FormRequest
{
    public function authorize(): bool
    {
        // Route is registered via Route::apiResource('academic-records', ...)
        // inside the 'role:3' group in routes/api.php — no per-request
        // Policy check needed here.
        return true;
    }

    public function rules(): array
    {
        return [
            'student_number'            => 'sometimes|string|max:50',
            // Same rule as store(): course_id is the only accepted input.
            // `course` is never taken from the client, so it can't drift
            // from whatever program course_id actually points to.
            'course_id'                 => 'sometimes|integer|exists:programs,ogos_course_id',
            'year_level'                => 'nullable|string|max:50',
            'school_year_admitted'      => 'nullable|string|max:20',
            'last_school_year_attended' => 'nullable|string|max:20',
        ];
    }
}
