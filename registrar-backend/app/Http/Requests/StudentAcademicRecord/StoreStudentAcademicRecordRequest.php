<?php

namespace App\Http\Requests\StudentAcademicRecord;

use Illuminate\Foundation\Http\FormRequest;

class StoreStudentAcademicRecordRequest extends FormRequest
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
            'student_profile_id'        => 'required|integer|exists:student_profile,student_profile_id',
            'student_number'            => 'required|string|max:50',
            // course_id is the only client-supplied source of truth for the
            // program. `course` is NOT accepted from the client — the
            // controller derives it as a point-in-time snapshot of
            // programs.name, so that later edits to OGOS/programs.name
            // don't retroactively change already-generated certificates.
            // See OgosStudentService::upsertLocalRecords(), which follows
            // the same course_id + course pairing on the sync path.
            'course_id'                 => 'required|integer|exists:programs,ogos_course_id',
            'year_level'                => 'nullable|string|max:50',
            'school_year_admitted'      => 'nullable|string|max:20',
            'last_school_year_attended' => 'nullable|string|max:20',
            // has_honorable_dismissal / graduation_date intentionally
            // excluded — no such columns exist on student_academic_record
            // (confirmed via SHOW CREATE TABLE). Submitting them previously
            // passed validation, then failed with a fatal "Unknown column"
            // SQL error on create().
        ];
    }
}
