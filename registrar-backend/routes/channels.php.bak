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

/*
|--------------------------------------------------------------------------
| PRIVATE CHANNEL: admin.notifications
|--------------------------------------------------------------------------
| Admin-only broadcast channel (new requests, payment verification, etc.)
| Only role_id 3 (Admin) and role_id 4 (Super Admin) can subscribe.
| Using the model's constants keeps this in sync if roles ever change.
|--------------------------------------------------------------------------
*/
Broadcast::channel('admin.notifications', function (SystemUser $user) {
    return in_array($user->role_id, [
        SystemUser::ROLE_ADMIN,
        SystemUser::ROLE_SUPER_ADMIN,
    ]);
});
