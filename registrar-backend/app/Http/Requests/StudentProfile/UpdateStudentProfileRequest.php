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
            // max:20 matches the student_profile.suffix column width (see
            // 2026_04_01_000000_create_base_schema.php). OGOS never
            // supplies this field (see OgosStudentDTO), so this endpoint is
            // the only real way a student's suffix ever gets recorded —
            // see OgosStudentService::upsertLocalRecords() for how the
            // login-time OGOS sync preserves whatever is saved here.
            'suffix'        => 'nullable|string|max:20',
            'date_of_birth' => 'sometimes|date',
        ];
    }
}