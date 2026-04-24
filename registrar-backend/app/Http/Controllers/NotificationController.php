<?php

namespace App\Http\Controllers;

use App\Http\Resources\NotificationResource;
use App\Models\Notification;
use App\Models\SystemUser;
use App\Services\NotificationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Notification HTTP adapter.
 *
 * All response shaping is delegated to NotificationResource.
 */
class NotificationController extends Controller
{
    // -------------------------------------------------------
    // GET /notifications
    // -------------------------------------------------------
    public function index(Request $request): JsonResponse
    {
        /** @var SystemUser $user */
        $user = $request->user();

        $query = Notification::with('type')
            ->where('notifiable_type', SystemUser::class)
            ->where('notifiable_id', $user->user_id)
            ->whereNull('deleted_at')
            ->orderBy('created_at', 'desc');

        if ($request->boolean('unread_only')) {
            $query->whereNull('read_at');
        }

        // NotificationResource::collection preserves pagination metadata
        return response()->json(
            NotificationResource::collection($query->paginate(20))
        );
    }

    // -------------------------------------------------------
    // GET /notifications/unread-count
    // -------------------------------------------------------
    public function unreadCount(Request $request): JsonResponse
    {
        /** @var SystemUser $user */
        $user = $request->user();

        return response()->json([
            'count' => NotificationService::unreadCount($user),
        ]);
    }

    // -------------------------------------------------------
    // POST /notifications/{id}/read
    // -------------------------------------------------------
    public function markAsRead(Request $request, string $id): JsonResponse
    {
        /** @var SystemUser $user */
        $user = $request->user();

        $notification = Notification::where('id', $id)
            ->where('notifiable_type', SystemUser::class)
            ->where('notifiable_id', $user->user_id)
            ->whereNull('deleted_at')
            ->firstOrFail();

        $notification->markAsRead();

        return response()->json(['message' => 'Notification marked as read.']);
    }

    // -------------------------------------------------------
    // POST /notifications/read-all
    // -------------------------------------------------------
    public function markAllAsRead(Request $request): JsonResponse
    {
        /** @var SystemUser $user */
        $user = $request->user();

        NotificationService::markAllAsRead($user);

        return response()->json(['message' => 'All notifications marked as read.']);
    }

    // -------------------------------------------------------
    // DELETE /notifications/{id}
    // -------------------------------------------------------
    public function destroy(Request $request, string $id): JsonResponse
    {
        /** @var SystemUser $user */
        $user = $request->user();

        $notification = Notification::where('id', $id)
            ->where('notifiable_type', SystemUser::class)
            ->where('notifiable_id', $user->user_id)
            ->whereNull('deleted_at')
            ->firstOrFail();

        $notification->delete();

        return response()->json(['message' => 'Notification dismissed.']);
    }
}
