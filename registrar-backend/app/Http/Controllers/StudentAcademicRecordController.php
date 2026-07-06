<?php

namespace App\Http\Controllers;

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
            'course'                   => 'required|string|max:255',
            'year_level'               => 'nullable|string|max:50',
            'school_year_admitted'     => 'nullable|string|max:20',
            'last_school_year_attended'=> 'nullable|string|max:20',
            // has_honorable_dismissal / graduation_date removed — no such
            // columns exist on student_academic_record (confirmed via
            // SHOW CREATE TABLE), and nothing else in the app reads them.
            // Submitting them previously passed validation, then failed
            // with a fatal "Unknown column" SQL error on create().
        ]);

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
            'course'                   => 'sometimes|string|max:255',
            'year_level'               => 'nullable|string|max:50',
            'school_year_admitted'     => 'nullable|string|max:20',
            'last_school_year_attended'=> 'nullable|string|max:20',
        ]);

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
