<?php

use Illuminate\Support\Facades\Broadcast;
use App\Models\SystemUser;

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
