<?php

namespace App\Http\Controllers;

use App\Models\StudentProfile;
use Illuminate\Http\Request;

/**
 * Student profile management.
 *
 * All mutations use explicit validation — no mass assignment from raw request data.
 */
class StudentProfileController extends Controller
{
    public function index()
    {
        return response()->json(StudentProfile::with('user')->get(), 200);
    }

    public function show($id)
    {
        $profile = StudentProfile::with('user', 'academicRecords')->findOrFail($id);
        return response()->json($profile, 200);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'user_id'           => 'required|integer|exists:users,user_id',
            'first_name'        => 'required|string|max:100',
            'middle_name'       => 'nullable|string|max:100',
            'last_name'         => 'required|string|max:100',
            'date_of_birth'     => 'required|date',
            'permanent_address' => 'required|string|max:500',
            'contact_number'    => 'required|string|max:20',
        ]);

        $profile = StudentProfile::create($validated);
        return response()->json($profile, 201);
    }

    public function update(Request $request, $id)
    {
        $profile = StudentProfile::findOrFail($id);

        $validated = $request->validate([
            'first_name'        => 'sometimes|string|max:100',
            'middle_name'       => 'nullable|string|max:100',
            'last_name'         => 'sometimes|string|max:100',
            'date_of_birth'     => 'sometimes|date',
            'permanent_address' => 'sometimes|string|max:500',
            'contact_number'    => 'sometimes|string|max:20',
        ]);

        $profile->update($validated);
        return response()->json($profile, 200);
    }

    public function destroy($id)
    {
        $profile = StudentProfile::findOrFail($id);
        $profile->delete();
        return response()->json(['message' => 'Profile deleted'], 200);
    }
}
