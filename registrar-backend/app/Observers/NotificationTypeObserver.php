<?php

namespace App\Observers;

use App\Models\NotificationType;
use Illuminate\Support\Facades\Cache;

/**
 * Invalidates the NotificationType cache whenever a type is created,
 * updated, or deleted via the admin UI or seeder.
 *
 * Context: NotificationService caches NotificationType lookups under the key
 * "notif_type:{trigger_event}" with a 6-hour TTL to avoid a DB hit on every
 * send(). Without this observer, an admin editing a notification template
 * title or message_template would have no effect for up to 6 hours because
 * every broadcast job would still read the stale cached value.
 *
 * With this observer, any write to notification_types immediately clears the
 * relevant cache key, so the next send() fetches the fresh value from DB and
 * re-populates the cache.
 *
 * Registered in AppServiceProvider::boot().
 */
class NotificationTypeObserver
{
    /**
     * Forget the cache key after any create or update.
     * 'saved' fires for both — no need to hook 'created' and 'updated' separately.
     */
    public function saved(NotificationType $type): void
    {
        Cache::forget("notif_type:{$type->trigger_event}");
    }

    /**
     * Forget the cache key when a type is soft- or hard-deleted.
     */
    public function deleted(NotificationType $type): void
    {
        Cache::forget("notif_type:{$type->trigger_event}");
    }

    /**
     * Forget the cache key when a soft-deleted type is restored.
     * Prevents the restored type from being shadowed by a stale null entry.
     */
    public function restored(NotificationType $type): void
    {
        Cache::forget("notif_type:{$type->trigger_event}");
    }
}
