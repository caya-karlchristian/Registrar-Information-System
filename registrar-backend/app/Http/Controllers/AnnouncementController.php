<?php

namespace App\Http\Controllers;

use App\Models\Announcement;
use App\Models\SystemUser;
use App\Services\NotificationService;
use Illuminate\Http\Request;

class AnnouncementController extends Controller
{
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

        $announcement = Announcement::create([
            'title'      => $validated['title'],
            'content'    => $validated['content'],
            'enabled'    => true,
            'created_by' => $request->user()->user_id,
        ]);

        NotificationService::sendToAllExcept(
            excludedRoleIds: [SystemUser::ROLE_SUPER_ADMIN],
            triggerEvent:    'announcement_published',
            data: [
                'announcement_id'      => $announcement->id,
                'announcement_title'   => $announcement->title,
                'announcement_content' => $announcement->content,
            ],
        );
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
