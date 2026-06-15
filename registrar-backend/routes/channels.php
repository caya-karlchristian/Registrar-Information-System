<?php

use Illuminate\Support\Facades\Broadcast;
use App\Models\SystemUser;

if (app()->environment('testing')) {
    return;
}

/*
|--------------------------------------------------------------------------
| PRIVATE CHANNEL: notifications.{userId}
|--------------------------------------------------------------------------
| Personal notification channel for each user.
| A user can ONLY subscribe to their own channel — we verify
| the authenticated user's user_id matches the channel's {userId}.
|--------------------------------------------------------------------------
*/
Broadcast::channel('notifications.{userId}', function (SystemUser $user, int $userId) {
    return (int) $user->user_id === (int) $userId;
});

// admin.notifications channel removed — NotificationSent::broadcastOn()
// only broadcasts to the personal notifications.{userId} channel.
// Each admin receives their own copy via SendBulkNotificationJob.
// Re-add this channel if you ever introduce a true shared admin broadcast.


/*
|--------------------------------------------------------------------------
| PRIVATE CHANNEL: admin.notifications
|--------------------------------------------------------------------------
| Shared channel for all admin users.
| Kept here as a defensive definition — channel auth will not 403
| if the frontend accidentally subscribes. Only admin and super_admin
| roles are authorised to join.
| NotificationSent currently broadcasts to personal channels only;
| this channel is available for future shared-admin broadcasts.
|--------------------------------------------------------------------------
*/
Broadcast::channel('admin.notifications', function (SystemUser $user) {
    return $user->isAdmin() || $user->isSuperAdmin();
});
