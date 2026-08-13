<?php

namespace App\Http\Controllers;

use App\Services\BusinessCalendarService;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Cache;

/**
 * Public, unauthenticated endpoint so the student-facing request form
 * (Step 4) can tell requesters whether the Registrar is currently open
 * and, if not, when processing on their request will actually begin.
 *
 * Deliberately thin: all the real logic (weekly hours, holidays, overnight
 * windows) lives in BusinessCalendarService::currentStatus() so this can
 * never drift from the SLA-clock rules used elsewhere in the app.
 *
 * Cached briefly since it's public and unauthenticated — nothing here
 * changes minute to minute, and this avoids a DB round trip on every
 * request-form page load / step transition.
 */
class BusinessHoursController extends Controller
{
    private const CACHE_TTL_SECONDS = 60;

    public function status(BusinessCalendarService $calendarService)
    {
        $timezone = config('app.display_timezone', 'Asia/Manila');

        // Cache key buckets by minute, not a rolling TTL from first request,
        // so the "closes_at"/"next_open_at" values returned stay accurate
        // to within the cache window rather than serving an increasingly
        // stale computation to a long-lived cache entry.
        $bucket = now($timezone)->format('Y-m-d-H-i');
        $cacheKey = "business-hours-status:{$bucket}";

        $status = Cache::remember($cacheKey, self::CACHE_TTL_SECONDS, function () use ($calendarService, $timezone) {
            $result = $calendarService->currentStatus(Carbon::now($timezone));

            return [
                'is_open'      => $result['is_open'],
                'next_open_at' => $result['next_open_at']?->toIso8601String(),
                'closes_at'    => $result['closes_at']?->toIso8601String(),
            ];
        });

        return response()->json([
            ...$status,
            'timezone' => $timezone,
        ]);
    }
}
