<?php

namespace App\Services\Concerns;

use Illuminate\Cache\TaggableStore;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;

/**
 * Invalidates every cached analytics response (AnalyticsController and
 * SuperAdminAnalyticsController both cache under the shared "analytics"
 * Cache::tags() bucket, 10-minute TTL — see their docblocks) so a write
 * that changes an analytics figure is reflected on the next request
 * instead of waiting out the cache window.
 *
 * Extracted from DocumentRequestService (its original home, fixing
 * RIS-PROCESS-BUGS #9) into a trait because the same gap exists on every
 * OTHER write path that changes something a cached analytics endpoint
 * counts: AccessRequestService (create/approve/reject an access request
 * moves the Access Request Throughput panel) and ShredExpiredRequests
 * (the auto-forfeit cron writes status_id directly to the DB, bypassing
 * DocumentRequestService::updateRequest() entirely, which is what let
 * the Forfeited summary card go stale after an automated forfeiture).
 * One implementation now backs every caller instead of copy-pasted
 * try/catch blocks drifting apart over time.
 *
 * USAGE: call $this->flushAnalyticsCache() once, AFTER the write that
 * should invalidate the cache has durably committed — never from inside
 * a DB::transaction() closure that might still roll back, and never
 * once-per-row in a loop (Cache::tags(['analytics'])->flush() clears the
 * whole tag regardless of how many rows changed, so flushing N times
 * for N rows is N-1 wasted Redis round trips; flush once after the loop
 * instead — see ShredExpiredRequests for the pattern).
 */
trait FlushesAnalyticsCache
{
    /**
     * Cache::tags() requires a taggable store (Redis — see
     * AnalyticsController's docblock; it does NOT work with the "file"
     * driver). Guarded with an instanceof check plus a try/catch so a
     * misconfigured or momentarily-unavailable cache backend degrades to
     * "analytics are stale for up to 10 minutes, as before" rather than
     * failing the business transaction it's piggybacking on — the cache
     * is a performance optimization, not a source of truth, and must
     * never be allowed to break the write it's invalidating after.
     */
    protected function flushAnalyticsCache(): void
    {
        try {
            $store = Cache::getStore();

            if ($store instanceof TaggableStore) {
                Cache::tags(['analytics'])->flush();
            }
        } catch (\Throwable $e) {
            Log::warning('Failed to flush analytics cache.', [
                'caller'    => static::class,
                'exception' => $e->getMessage(),
            ]);
        }
    }
}
