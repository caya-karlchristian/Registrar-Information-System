<?php

namespace App\Http\Controllers;

use App\Services\BusinessCalendarService;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Cache;

/**
 * Public, unauthenticated endpoint so the student-facing request form
 * (Step 4) can tell requesters whether the Registrar is currently open
 * and, if not, when processing on their request will actually begin —
 * and, from Step 5 onward, *why* it's closed when the reason is something
 * out of the ordinary (a suspension, a one-off event, or a recurring
 * closure like WFH Mondays) rather than a plain weekend/evening.
 *
 * Deliberately thin: all the real logic (weekly hours, exceptions,
 * overrides, overnight windows) lives in BusinessCalendarService so this
 * can never drift from the SLA-clock rules used elsewhere in the app.
 *
 * Cached briefly since it's public and unauthenticated — nothing here
 * changes minute to minute, and this avoids a DB round trip on every
 * request-form page load / step transition.
 */
class BusinessHoursController extends Controller
{
    private const CACHE_TTL_SECONDS = 60;

    public function status(Request $request, BusinessCalendarService $calendarService)
    {
        $timezone = config('app.display_timezone', 'Asia/Manila');
        $calendarId = $request->filled('calendar_id') ? $request->integer('calendar_id') : null;

        // Cache key buckets by minute, not a rolling TTL from first request,
        // so the "closes_at"/"next_open_at" values returned stay accurate
        // to within the cache window rather than serving an increasingly
        // stale computation to a long-lived cache entry. Bucketed per
        // calendar so a future non-default calendar's status never
        // collides with the default one's cache entry.
        $bucket = now($timezone)->format('Y-m-d-H-i');
        $cacheKey = "business-hours-status:".($calendarId ?? 'default').":{$bucket}";

        $status = Cache::remember($cacheKey, self::CACHE_TTL_SECONDS, function () use ($calendarService, $timezone, $calendarId) {
            $result = $calendarService->currentStatus(Carbon::now($timezone), $calendarId);

            return [
                'is_open'      => $result['is_open'],
                'next_open_at' => $result['next_open_at']?->toIso8601String(),
                'closes_at'    => $result['closes_at']?->toIso8601String(),
                'reason'       => $result['reason'] ?? null,
            ];
        });

        return response()->json([
            ...$status,
            'timezone' => $timezone,
        ]);
    }

    /**
     * GET /business-hours/upcoming-closures — dated closures and active
     * recurring-override days in the next N days (default 14, capped at
     * 60), so the request form can show a "heads up" list rather than
     * only the single current status. Same cache-by-minute-bucket
     * reasoning as status() above.
     */
    public function upcomingClosures(Request $request, BusinessCalendarService $calendarService)
    {
        $timezone = config('app.display_timezone', 'Asia/Manila');
        $calendarId = $request->filled('calendar_id') ? $request->integer('calendar_id') : null;
        $days = min($request->integer('days', 14), 60);

        $bucket = now($timezone)->format('Y-m-d-H');
        $cacheKey = "business-hours-upcoming:".($calendarId ?? 'default').":{$days}:{$bucket}";

        $closures = Cache::remember($cacheKey, self::CACHE_TTL_SECONDS, function () use ($calendarService, $timezone, $calendarId, $days) {
            return $calendarService->upcomingClosures(Carbon::now($timezone), $days, $calendarId);
        });

        return response()->json($closures);
    }
}
