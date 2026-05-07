<?php

namespace App\Http\Controllers;

use App\Models\RequestPurpose;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class RequestPurposeController extends Controller
{
    /**
     * GET /api/request-purposes
     *
     * Returns all request purposes, ordered alphabetically.
     * Cached for 1 hour — purposes rarely change and are fetched on every
     * request-form load by every authenticated user.
     */
    public function index(): JsonResponse
    {
        $purposes = cache()->remember('request_purposes.all', now()->addHour(), function () {
            return RequestPurpose::orderBy('purpose_name')->get();
        });

        return response()->json($purposes);
    }

    /**
     * GET /api/request-purposes/{id}
     */
    public function show(int $id): JsonResponse
    {
        $purpose = RequestPurpose::find($id);

        if (! $purpose) {
            return response()->json(['message' => 'Request purpose not found.'], 404);
        }

        return response()->json($purpose);
    }

    /**
     * POST /api/request-purposes
     * Admin / Superadmin only.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'purpose_name' => 'required|string|max:100|unique:request_purpose,purpose_name',
        ]);

        $purpose = RequestPurpose::create($validated);

        cache()->forget('request_purposes.all');

        return response()->json($purpose, 201);
    }

    /**
     * PUT /api/request-purposes/{id}
     * Admin / Superadmin only.
     */
    public function update(Request $request, int $id): JsonResponse
    {
        $purpose = RequestPurpose::find($id);

        if (! $purpose) {
            return response()->json(['message' => 'Request purpose not found.'], 404);
        }

        $validated = $request->validate([
            'purpose_name' => "required|string|max:100|unique:request_purpose,purpose_name,{$id},request_purpose_id",
        ]);

        $purpose->update($validated);

        cache()->forget('request_purposes.all');

        return response()->json($purpose);
    }

    /**
     * DELETE /api/request-purposes/{id}
     * Admin / Superadmin only.
     *
     * A purpose cannot be deleted while it is referenced by existing
     * document requests — the DB foreign key will throw an integrity
     * exception which we surface as a 409 Conflict.
     */
    public function destroy(int $id): JsonResponse
    {
        $purpose = RequestPurpose::find($id);

        if (! $purpose) {
            return response()->json(['message' => 'Request purpose not found.'], 404);
        }

        try {
            $purpose->delete();
        } catch (\Illuminate\Database\QueryException $e) {
            // MySQL error 1451 — FK constraint violation
            if ($e->getCode() === '23000') {
                return response()->json([
                    'message' => 'Cannot delete a purpose that is referenced by existing document requests.',
                ], 409);
            }

            throw $e;
        }

        cache()->forget('request_purposes.all');

        return response()->json(['message' => 'Request purpose deleted.']);
    }
}
