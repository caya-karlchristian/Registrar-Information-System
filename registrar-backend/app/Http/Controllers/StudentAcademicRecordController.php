<?php

namespace App\Http\Controllers;

use App\Http\Requests\StudentAcademicRecord\StoreStudentAcademicRecordRequest;
use App\Http\Requests\StudentAcademicRecord\UpdateStudentAcademicRecordRequest;
use App\Models\Program;
use App\Models\StudentAcademicRecord;

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

    public function store(StoreStudentAcademicRecordRequest $request)
    {
        $validated = $request->validated();

        $validated['course'] = Program::findOrFail($validated['course_id'])->name;

        $record = StudentAcademicRecord::create($validated);

        return response()->json($record, 201);
    }

    public function update(UpdateStudentAcademicRecordRequest $request, $id)
    {
        $record = StudentAcademicRecord::find($id);
        if (!$record) {
            return response()->json(['message' => 'Record not found'], 404);
        }

        $validated = $request->validated();

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

        try {
            $record->delete();
        } catch (\Illuminate\Database\QueryException $e) {
            if ($e->getCode() === '23000') {
                return response()->json([
                    'message' => 'Cannot delete this academic record because it is still referenced elsewhere.',
                ], 409);
            }

            throw $e;
        }

        return response()->json(['message' => 'Record deleted'], 200);
    }
}