<?php

namespace App\Http\Controllers;

use App\Models\Announcement;
use App\Models\AuditLog;
use App\Models\SystemUser;
use App\Services\AnnouncementService;
use App\Services\AuditLogger;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

/**
 * Announcement HTTP adapter.
 *
 * Creating an announcement also broadcasts a notification to all
 * non-superadmin users. That side-effect is owned by
 * AnnouncementService — this controller stays a thin HTTP layer.
 */
class AnnouncementController extends Controller
{
    public function __construct(
        private AnnouncementService $announcementService,
        private AuditLogger $auditLogger,
    ) {}

    public function index(Request $request)
    {
        $perPage = $request->input('per_page', 4);

        // Archived tab: bypass the default ExcludeArchivedScope entirely and
        // return ONLY archived announcements, mirroring how
        // DocumentRequestController::index() handles ?view=archived.
        if ($request->query('view') === 'archived') {
            return response()->json(
                Announcement::withArchived()
                    ->where('is_archived', true)
                    ->orderByDesc('archived_on')
                    ->paginate($perPage)
            );
        }

        return response()->json(
            Announcement::latest()->paginate($perPage)
        );
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'title'    => 'required|string|max:255',
            'content'  => 'required|string',
            'end_date' => 'nullable|date',
        ]);

        $announcement = $this->announcementService->create($validated, $request->user());

        return response()->json($announcement, 201);
    }

    public function show(Announcement $announcement)
    {
        return response()->json($announcement);
    }

    public function update(Request $request, Announcement $announcement)
    {
        $validated = $request->validate([
            'title'    => 'sometimes|string|max:255',
            'content'  => 'sometimes|string',
            'enabled'  => 'sometimes|boolean',
            'end_date' => 'sometimes|nullable|date',
        ]);

        $announcement->update($validated);

        return response()->json($announcement);
    }

    public function destroy(Announcement $announcement)
    {
        $announcement->delete();

        return response()->json(['message' => 'Announcement deleted.']);
    }

    // -------------------------------------------------------------------------
    // Archive / Restore
    //
    // Per the Announcement Archive policy: only a Disabled announcement can
    // be archived; restoring always comes back Disabled. Uses
    // Announcement::withArchived() lookups (not implicit route-model
    // binding) since ExcludeArchivedScope would otherwise 404 the restore
    // endpoint before it ever runs.
    // -------------------------------------------------------------------------

    // PATCH /announcements/{id}/archive
    public function archive(Request $request, $id)
    {
        $announcement = Announcement::withArchived()->findOrFail($id);

        /** @var SystemUser $actor */
        $actor = Auth::user();

        $validated = $request->validate([
            'reason' => 'nullable|string|max:500',
        ]);

        try {
            $announcement = $this->announcementService->archive($announcement, $actor);
        } catch (\RuntimeException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        $this->auditLogger->log($request, $actor, AuditLog::ACTION_ANNOUNCEMENT_ARCHIVED, [
            'announcement_id' => $announcement->id,
            'title'           => $announcement->title,
            'reason'          => $validated['reason'] ?? null,
        ]);

        return response()->json($announcement->fresh(), 200);
    }

    // PATCH /announcements/{id}/restore
    public function restore(Request $request, $id)
    {
        $announcement = Announcement::withArchived()->findOrFail($id);

        /** @var SystemUser $actor */
        $actor = Auth::user();

        $announcement = $this->announcementService->restore($announcement, $actor);

        $this->auditLogger->log($request, $actor, AuditLog::ACTION_ANNOUNCEMENT_RESTORED, [
            'announcement_id' => $announcement->id,
            'title'           => $announcement->title,
        ]);

        return response()->json($announcement->fresh(), 200);
    }
}