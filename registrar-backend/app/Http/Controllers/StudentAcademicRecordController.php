<?php

namespace App\Http\Controllers;

use App\Models\Program;
use App\Models\StudentAcademicRecord;
use Illuminate\Http\Request;

class StudentAcademicRecordController extends Controller
{
    public function index()
    {
        return response()->json(
            StudentAcademicRecord::with('studentProfile')->paginate(50),
            200
        );
    }

    public function show($id)
    {
        $record = StudentAcademicRecord::with('studentProfile')->find($id);
        if (!$record) {
            return response()->json(['message' => 'Record not found'], 404);
        }

        return response()->json($record, 200);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'student_profile_id'       => 'required|integer|exists:student_profile,student_profile_id',
            'student_number'           => 'required|string|max:50',
            // course_id is the only client-supplied source of truth for the
            // program. `course` is NOT accepted from the client — it's a
            // point-in-time snapshot of programs.name, set here so that if
            // OGOS/programs.name is edited later (rename, typo fix), this
            // record — and any certificate already generated from it —
            // keeps showing the program name as it was at creation time.
            // See OgosStudentService::upsertLocalRecords(), which follows
            // the same course_id + course pairing on the sync path.
            'course_id'                => 'required|integer|exists:programs,ogos_course_id',
            'year_level'               => 'nullable|string|max:50',
            'school_year_admitted'     => 'nullable|string|max:20',
            'last_school_year_attended'=> 'nullable|string|max:20',
            // has_honorable_dismissal / graduation_date removed — no such
            // columns exist on student_academic_record (confirmed via
            // SHOW CREATE TABLE), and nothing else in the app reads them.
            // Submitting them previously passed validation, then failed
            // with a fatal "Unknown column" SQL error on create().
        ]);

        $validated['course'] = Program::findOrFail($validated['course_id'])->name;

        $record = StudentAcademicRecord::create($validated);

        return response()->json($record, 201);
    }

    public function update(Request $request, $id)
    {
        $record = StudentAcademicRecord::find($id);
        if (!$record) {
            return response()->json(['message' => 'Record not found'], 404);
        }

        $validated = $request->validate([
            'student_number'           => 'sometimes|string|max:50',
            // Same rule as store(): course_id is the only accepted input.
            // `course` is never taken from the client, so it can't drift
            // from whatever program course_id actually points to.
            'course_id'                => 'sometimes|integer|exists:programs,ogos_course_id',
            'year_level'               => 'nullable|string|max:50',
            'school_year_admitted'     => 'nullable|string|max:20',
            'last_school_year_attended'=> 'nullable|string|max:20',
        ]);

        if (array_key_exists('course_id', $validated)) {
            $validated['course'] = Program::findOrFail($validated['course_id'])->name;
        }

        $record->update($validated);

        return response()->json($record, 200);
    }

    public function destroy($id)
    {
        $record = StudentAcademicRecord::find($id);
        if (!$record) {
            return response()->json(['message' => 'Record not found'], 404);
        }

        $record->delete();

        return response()->json(['message' => 'Record deleted'], 200);
    }
}