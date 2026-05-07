<?php

namespace App\Http\Controllers;

use App\Models\StudentProfile;
use Illuminate\Http\Request;
use App\Exceptions\OgosException;
use App\Services\Ogos\OgosStudentService;

/**
 * Student profile management.
 *
 * All mutations use explicit validation — no mass assignment from raw request data.
 */
class StudentProfileController extends Controller
{
    public function __construct(private OgosStudentService $ogos) {}

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

    // ── OGOS-backed endpoints ────────────────────────────────────────────────

    public function showByStudentNumber(string $studentNumber): \Illuminate\Http\JsonResponse
    {
        try {
            return response()->json($this->ogos->getEnrichedProfile($studentNumber));
        } catch (OgosException $e) {
            return response()->json(['message' => $e->getMessage()], $e->getCode() ?: 502);
        }
    }

    public function personalInfo(string $studentNumber): \Illuminate\Http\JsonResponse
    {
        try {
            return response()->json($this->ogos->getPersonalInfo($studentNumber));
        } catch (OgosException $e) {
            return response()->json(['message' => $e->getMessage()], $e->getCode() ?: 502);
        }
    }

    public function addresses(string $studentNumber): \Illuminate\Http\JsonResponse
    {
        try {
            return response()->json($this->ogos->getAddresses($studentNumber));
        } catch (OgosException $e) {
            return response()->json(['message' => $e->getMessage()], $e->getCode() ?: 502);
        }
    }

    public function search(\Illuminate\Http\Request $request): \Illuminate\Http\JsonResponse
    {
        try {
            return response()->json($this->ogos->search($request->query()));
        } catch (OgosException $e) {
            return response()->json(['message' => $e->getMessage()], $e->getCode() ?: 502);
        }
    }

}
