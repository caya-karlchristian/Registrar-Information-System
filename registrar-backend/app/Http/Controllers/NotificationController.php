<?php

namespace App\Http\Controllers;

use App\Models\Notification;
use App\Models\SystemUser;
use App\Services\NotificationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/*
|--------------------------------------------------------------------------
| NotificationController
|--------------------------------------------------------------------------
| Exposes 5 endpoints (all protected by auth:sanctum):
|
|   GET    /notifications              → paginated list for current user
|   GET    /notifications/unread-count → just the badge number
|   POST   /notifications/{id}/read   → mark one notification as read
|   POST   /notifications/read-all    → mark all as read
|   DELETE /notifications/{id}        → soft-delete (dismiss) one
|--------------------------------------------------------------------------
*/

class NotificationController extends Controller
{
    // -------------------------------------------------------
    // GET /notifications
    // -------------------------------------------------------
    // Returns the current user's notifications, newest first.
    // Paginated at 20 per page so the bell dropdown doesn't
    // load hundreds of rows at once.
    //
    // Query params:
    //   ?unread_only=true  → only return unread notifications
    //   ?page=2            → pagination (Laravel handles this automatically)
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

        // Optional filter: only unread
        if ($request->boolean('unread_only')) {
            $query->whereNull('read_at');
        }

        $notifications = $query->paginate(20);

        // Transform each notification into a clean shape for the frontend.
        // We use ->through() so the pagination metadata is preserved
        // (current_page, last_page, total, etc.) while transforming items.
        $notifications->through(function (Notification $n) {
            return [
                'id'         => $n->id,
                'title'      => $n->type->title,
                'message'    => $n->data['message'] ?? '',
                'type'       => $n->type->trigger_event,
                'request_id' => $n->request_id,
                'read_at'    => $n->read_at?->toISOString(),
                'created_at' => $n->created_at->toISOString(),
                'is_unread'  => is_null($n->read_at),
            ];
        });

        return response()->json($notifications);
    }

    // -------------------------------------------------------
    // GET /notifications/unread-count
    // -------------------------------------------------------
    // Returns just the number for the bell badge.
    // Kept as a separate lightweight endpoint so the frontend
    // can poll this cheaply without loading full notification data.
    // (Once WebSockets are live this is less needed, but good to have.)
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
    // Marks a single notification as read.
    // We verify ownership — a user cannot mark someone else's
    // notification as read.
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
        // firstOrFail() automatically returns 404 if not found
        // — no manual "if not found return 404" needed

        $notification->markAsRead();

        return response()->json(['message' => 'Notification marked as read.']);
    }

    // -------------------------------------------------------
    // POST /notifications/read-all
    // -------------------------------------------------------
    // Marks ALL of the current user's unread notifications as read.
    // This is what fires when the user opens the bell dropdown
    // or clicks "Mark all as read".
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
    // Soft-deletes (dismisses) a single notification.
    // The row stays in the DB with deleted_at set.
    // The user will no longer see it in their list.
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

        $notification->delete(); // SoftDeletes trait handles this
        // Sets deleted_at = now(), does NOT run DELETE SQL

        return response()->json(['message' => 'Notification dismissed.']);
    }
}
