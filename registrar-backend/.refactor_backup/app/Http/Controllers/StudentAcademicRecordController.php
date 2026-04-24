<?php

namespace App\Http\Controllers;

use App\Models\StudentAcademicRecord;
use Illuminate\Http\Request;

class StudentAcademicRecordController extends Controller
{
    public function index()
    {
        return response()->json(StudentAcademicRecord::with('studentProfile')->get(), 200);
    }

    public function show($id)
    {
        $record = StudentAcademicRecord::with('studentProfile')->find($id);
        if (!$record) return response()->json(['message' => 'Record not found'], 404);

        return response()->json($record, 200);
    }

    public function store(Request $request)
    {
        $request->validate([
            'student_profile_id' => 'required|integer',
            'student_number' => 'required|string',
            'course' => 'required|string',
            'year_level' => 'nullable|string',
            'school_year_admitted' => 'nullable|string',
            'last_school_year_attended' => 'nullable|string',
            'has_honorable_dismissal' => 'nullable|boolean',
            'graduation_date' => 'nullable|date',
        ]);

        $record = StudentAcademicRecord::create($request->all());
        return response()->json($record, 201);
    }

    public function update(Request $request, $id)
    {
        $record = StudentAcademicRecord::find($id);
        if (!$record) return response()->json(['message' => 'Record not found'], 404);

        $record->update($request->all());
        return response()->json($record, 200);
    }

    public function destroy($id)
    {
        $record = StudentAcademicRecord::find($id);
        if (!$record) return response()->json(['message' => 'Record not found'], 404);

        $record->delete();
        return response()->json(['message' => 'Record deleted'], 200);
    }
}
