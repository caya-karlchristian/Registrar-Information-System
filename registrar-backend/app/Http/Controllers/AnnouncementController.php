<?php

namespace App\Http\Controllers;

use App\Models\Announcement;
use App\Services\AnnouncementService;
use Illuminate\Http\Request;

/**
 * Announcement HTTP adapter.
 *
 * Creating an announcement also broadcasts a notification to all
 * non-superadmin users. That side-effect is owned by
 * AnnouncementService — this controller stays a thin HTTP layer.
 */
class AnnouncementController extends Controller
{
    public function __construct(private AnnouncementService $announcementService) {}

    public function index(Request $request)
    {
        $perPage = $request->input('per_page', 4);

        return response()->json(
            Announcement::latest()->paginate($perPage)
        );
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'title'   => 'required|string|max:255',
            'content' => 'required|string',
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
            'title'   => 'sometimes|string|max:255',
            'content' => 'sometimes|string',
            'enabled' => 'sometimes|boolean',
        ]);

        $announcement->update($validated);

        return response()->json($announcement);
    }

    public function destroy(Announcement $announcement)
    {
        $announcement->delete();

        return response()->json(['message' => 'Announcement deleted.']);
    }
}
