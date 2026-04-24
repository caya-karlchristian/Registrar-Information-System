<?php

namespace App\Http\Controllers;

use App\Models\RequestHistory;
use Illuminate\Http\JsonResponse;

/**
 * Request history — READ ONLY.
 *
 * History is an immutable audit trail written exclusively by
 * DocumentRequestService::updateRequest(). It must never be
 * created, modified, or deleted via the API.
 */
class RequestHistoryController extends Controller
{
    // -------------------------------------------------------------------------
    // GET /request-history
    // -------------------------------------------------------------------------
    public function index(): JsonResponse
    {
        return response()->json(
            RequestHistory::with(['request', 'oldStatus', 'newStatus', 'changedBy'])
                ->orderByDesc('changed_at')
                ->get(),
            200
        );
    }

    // -------------------------------------------------------------------------
    // GET /request-history/{id}
    // -------------------------------------------------------------------------
    public function show($id): JsonResponse
    {
        $history = RequestHistory::with(['request', 'oldStatus', 'newStatus', 'changedBy'])->find($id);

        if (!$history) {
            return response()->json(['message' => 'History not found'], 404);
        }

        return response()->json($history, 200);
    }
}
