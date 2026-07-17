<?php

namespace App\Http\Controllers;

use App\Models\RequestStatus;
use Illuminate\Http\Request;

class RequestStatusController extends Controller
{
    public function index()
    {
        return response()->json(RequestStatus::all(), 200);
    }

    public function show($id)
    {
        $status = RequestStatus::find($id);
        if (!$status) return response()->json(['message' => 'Status not found'], 404);

        return response()->json($status, 200);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'status_name' => 'required|string|max:50',
        ]);

        $status = RequestStatus::create($validated);
        return response()->json($status, 201);
    }

    public function update(Request $request, $id)
    {
        $status = RequestStatus::find($id);
        if (!$status) return response()->json(['message' => 'Status not found'], 404);

        $validated = $request->validate([
            'status_name' => 'required|string|max:50',
        ]);

        $status->update($validated);
        return response()->json($status, 200);
    }

    public function destroy($id)
    {
        $status = RequestStatus::find($id);
        if (!$status) return response()->json(['message' => 'Status not found'], 404);

        try {
            $status->delete();
        } catch (\Illuminate\Database\QueryException $e) {
            // MySQL error 1451 — FK constraint violation
            if ($e->getCode() === '23000') {
                return response()->json([
                    'message' => 'Cannot delete a status that is referenced by existing document requests or request history.',
                ], 409);
            }

            throw $e;
        }

        return response()->json(['message' => 'Status deleted'], 200);
    }
}