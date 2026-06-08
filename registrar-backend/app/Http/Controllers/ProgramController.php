<?php

namespace App\Http\Controllers;

use App\Models\Program;
use Illuminate\Http\JsonResponse;

/**
 * Read-only reference data endpoint for academic programs.
 *
 * Programs are populated automatically on student SSO login via
 * OgosStudentService — this controller only exposes what's already there.
 *
 * Matches the response shape of all other reference data endpoints
 * (document-types, certifications, request-statuses, request-purposes)
 * so the frontend ReferenceDataContext can treat it uniformly.
 */
class ProgramController extends Controller
{
    /**
     * GET /api/programs
     *
     * Returns all active programs, ordered alphabetically by name.
     * The frontend dropdown uses `name` as the label and `ogos_course_id`
     * as the value — matching what's stored in student_academic_record.course_id.
     */
    public function index(): JsonResponse
    {
        $programs = Program::active()
            ->orderBy('name')
            ->get(['ogos_course_id', 'code', 'name']);

        return response()->json(['data' => $programs], 200);
    }
}
