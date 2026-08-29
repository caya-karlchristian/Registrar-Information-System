<?php

namespace App\Http\Controllers;

use App\Http\Requests\FulfillmentTrack\StoreFulfillmentTrackRequest;
use App\Http\Requests\FulfillmentTrack\UpdateFulfillmentTrackRequest;
use App\Models\AuditLog;
use App\Models\FulfillmentTrack;
use App\Models\SystemUser;
use App\Services\AuditLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

/**
 * CRUD for the fulfillment_track lookup table.
 *
 * FulfillmentTrack's own class docblock already describes this table as
 * "rows are added/renamed via an admin screen, never a migration" — that
 * screen never actually existed until this controller. Before this,
 * every fulfillment_track row could only be created or renamed directly
 * against the database (Tinker, a manual SQL statement, or a seeder),
 * completely outside RBAC and with zero audit trail — a materially
 * worse gap than the one this controller closes for logbook_category,
 * since at least that table had *a* CRUD screen, just an unaudited one.
 *
 * Mirrors LogbookCategoryController's shape exactly (same small,
 * rarely-changing, admin-editable lookup pattern, same route middleware
 * tier), but with audit logging included from the start rather than
 * needing a follow-up fix.
 */
class FulfillmentTrackController extends Controller
{
    public function __construct(private AuditLogger $auditLogger) {}

    /**
     * GET /api/fulfillment-tracks
     *
     * Returns all fulfillment tracks, ordered alphabetically. Cached for
     * 1 hour — same reasoning as LogbookCategoryController::index(): this
     * is reference data fetched by every authenticated role and rarely
     * changes.
     */
    public function index(): JsonResponse
    {
        $tracks = cache()->remember('fulfillment_tracks.all', now()->addHour(), function () {
            return FulfillmentTrack::orderBy('name')->get();
        });

        return response()->json($tracks);
    }

    /**
     * GET /api/fulfillment-tracks/{id}
     */
    public function show(int $id): JsonResponse
    {
        $track = FulfillmentTrack::find($id);

        if (! $track) {
            return response()->json(['message' => 'Fulfillment track not found.'], 404);
        }

        return response()->json($track);
    }

    /**
     * POST /api/fulfillment-tracks
     * Admin / Superadmin only.
     */
    public function store(StoreFulfillmentTrackRequest $request): JsonResponse
    {
        $track = FulfillmentTrack::create($request->validated());

        cache()->forget('fulfillment_tracks.all');

        /** @var SystemUser $actor */
        $actor = Auth::user();

        $this->auditLogger->log($request, $actor, AuditLog::ACTION_FULFILLMENT_TRACK_CREATED, [
            'fulfillment_track_id' => $track->fulfillment_track_id,
            'name'                 => $track->name,
        ]);

        return response()->json($track, 201);
    }

    /**
     * PUT /api/fulfillment-tracks/{id}
     * Admin / Superadmin only.
     */
    public function update(UpdateFulfillmentTrackRequest $request, int $id): JsonResponse
    {
        $track = FulfillmentTrack::find($id);

        if (! $track) {
            return response()->json(['message' => 'Fulfillment track not found.'], 404);
        }

        $track->update($request->validated());

        cache()->forget('fulfillment_tracks.all');

        /** @var SystemUser $actor */
        $actor = Auth::user();

        $this->auditLogger->log($request, $actor, AuditLog::ACTION_FULFILLMENT_TRACK_UPDATED, [
            'fulfillment_track_id' => $track->fulfillment_track_id,
            'name'                 => $track->name,
        ]);

        return response()->json($track);
    }

    /**
     * DELETE /api/fulfillment-tracks/{id}
     * Admin / Superadmin only.
     *
     * A track cannot be deleted while any document_type/certificate_type
     * row still points at it — the DB foreign key throws an integrity
     * exception, surfaced here as a 409 Conflict, same as
     * LogbookCategoryController::destroy().
     */
    public function destroy(Request $request, int $id): JsonResponse
    {
        $track = FulfillmentTrack::find($id);

        if (! $track) {
            return response()->json(['message' => 'Fulfillment track not found.'], 404);
        }

        try {
            $track->delete();
        } catch (\Illuminate\Database\QueryException $e) {
            // MySQL error 1451 — FK constraint violation
            if ($e->getCode() === '23000') {
                return response()->json([
                    'message' => 'Cannot delete a track that is still assigned to a document or certificate type.',
                ], 409);
            }

            throw $e;
        }

        cache()->forget('fulfillment_tracks.all');

        /** @var SystemUser $actor */
        $actor = Auth::user();

        $this->auditLogger->log($request, $actor, AuditLog::ACTION_FULFILLMENT_TRACK_DELETED, [
            'fulfillment_track_id' => $track->fulfillment_track_id,
            'name'                 => $track->name,
        ]);

        return response()->json(['message' => 'Fulfillment track deleted.']);
    }
}
