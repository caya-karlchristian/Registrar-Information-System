<?php

namespace App\Http\Controllers;

use App\Models\StudentProfile;
use Illuminate\Http\Request;

class StudentProfileController extends Controller
{
    public function index()
    {
        return response()->json(StudentProfile::with('user')->get(), 200);
    }

    public function show($id)
    {
        $profile = StudentProfile::with('user', 'academicRecords')->find($id);
        if (!$profile) return response()->json(['message' => 'Profile not found'], 404);

        return response()->json($profile, 200);
    }

    public function store(Request $request)
    {
        $request->validate([
            'user_id' => 'required|integer',
            'first_name' => 'required|string',
            'last_name' => 'required|string',
            'date_of_birth' => 'required|date',
            'permanent_address' => 'required|string',
            'contact_number' => 'required|string',
        ]);

        $profile = StudentProfile::create($request->all());
        return response()->json($profile, 201);
    }

    public function update(Request $request, $id)
    {
        $profile = StudentProfile::find($id);
        if (!$profile) return response()->json(['message' => 'Profile not found'], 404);

        $profile->update($request->all());
        return response()->json($profile, 200);
    }

    public function destroy($id)
    {
        $profile = StudentProfile::find($id);
        if (!$profile) return response()->json(['message' => 'Profile not found'], 404);

        $profile->delete();
        return response()->json(['message' => 'Profile deleted'], 200);
    }
}
