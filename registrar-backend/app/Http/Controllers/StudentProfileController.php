<?php

namespace App\Http\Controllers;

use App\Models\StudentProfile;
use Illuminate\Http\Request;
use App\Exceptions\OgosException;
use App\Services\Ogos\OgosStudentService;
use App\Exceptions\OgosException;
use App\Services\Ogos\OgosStudentService;

/**
 * Student profile management.
 *
 * All mutations use explicit validation — no mass assignment from raw request data.
 */
/**
 * Student profile management.
 *
 * All mutations use explicit validation — no mass assignment from raw request data.
 */
class StudentProfileController extends Controller
{
    public function __construct(private OgosStudentService $ogos) {}

    public function __construct(private OgosStudentService $ogos) {}

    public function index()
    {
        return response()->json(StudentProfile::with('user')->get(), 200);
    }

    public function show($id)
    {
        $profile = StudentProfile::with('user', 'academicRecords')->findOrFail($id);
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
            // permanent_address / contact_number removed — no such columns
            // exist on student_profile (confirmed via SHOW CREATE TABLE).
            // Both were marked 'required', so this endpoint 500'd on every
            // call before this fix — validation always passed (fields were
            // present) and create() always failed with a fatal "Unknown
            // column" SQL error.
        $validated = $request->validate([
            'user_id'           => 'required|integer|exists:users,user_id',
            'first_name'        => 'required|string|max:100',
            'middle_name'       => 'nullable|string|max:100',
            'last_name'         => 'required|string|max:100',
            'date_of_birth'     => 'required|date',
            // permanent_address / contact_number removed — no such columns
            // exist on student_profile (confirmed via SHOW CREATE TABLE).
            // Both were marked 'required', so this endpoint 500'd on every
            // call before this fix — validation always passed (fields were
            // present) and create() always failed with a fatal "Unknown
            // column" SQL error.
        ]);

        $profile = StudentProfile::create($validated);
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
        ]);
        $profile = StudentProfile::findOrFail($id);

        $validated = $request->validate([
            'first_name'        => 'sometimes|string|max:100',
            'middle_name'       => 'nullable|string|max:100',
            'last_name'         => 'sometimes|string|max:100',
            'date_of_birth'     => 'sometimes|date',
        ]);

        $profile->update($validated);
        $profile->update($validated);
        return response()->json($profile, 200);
    }

    public function destroy($id)
    {
        $profile = StudentProfile::findOrFail($id);

        try {
            $profile->delete();
        } catch (\Illuminate\Database\QueryException $e) {
            // MySQL error 1451 — FK constraint violation
            if ($e->getCode() === '23000') {
                return response()->json([
                    'message' => 'Cannot delete a student profile that still has academic records on file.',
                ], 409);
            }

            throw $e;
        }

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