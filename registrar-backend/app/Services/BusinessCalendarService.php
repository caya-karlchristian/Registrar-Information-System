<?php

namespace App\Services;

use App\Models\BusinessCalendar;
use Carbon\CarbonInterface;
use Illuminate\Support\Carbon;
use InvalidArgumentException;
use RuntimeException;

/**
 * The shared "how much time elapsed that someone actually had control
 * over" engine, used by both the Registrar's own processing-time SLA and
 * (from Step 3 onward) each external signing office's turnaround metric.
 *
 * Rather than raw wall-clock diffInMinutes(), every SLA calculation should
 * route through minutesBetween() here, which only counts minutes that fall
 * inside the relevant calendar's weekly office hours and skips declared
 * holidays entirely. A request filed Friday at 9 PM doesn't start
 * accumulating processing time until Monday's opening; a request filed at
 * 11 PM on a Tuesday doesn't count until the next morning.
 *
 * Calendars are looked up once per instance and memoized in $calendarCache,
 * since the same service instance is typically reused across many
 * minutesBetween() calls within a single request/report generation (e.g.
 * one analytics query iterating hundreds of RequestHistory rows).
 */
class BusinessCalendarService
{
    /** @var array<int, BusinessCalendar> */
    private array $calendarCache = [];

    /**
     * Hard ceiling on how many calendar days a single minutesBetween() call
     * will walk. A legitimate SLA window is days, not years — this guards
     * against a bad/garbage $start (e.g. a null-object epoch date) turning
     * into an effectively infinite loop.
     */
    private const MAX_DAYS = 3660; // ~10 years

    /**
     * How many days ahead currentStatus() will search for the next open
     * window before giving up. A calendar with no open day inside a month
     * is almost certainly a config error (weekly_hours all null, or a
     * holiday range accidentally covering everything), not a real closure.
     */
    private const MAX_LOOKAHEAD_DAYS = 30;

    /**
     * Business minutes elapsed between $start and $end, counting only
     * minutes that fall inside $calendarId's weekly office hours and are
     * not a declared holiday for that calendar. Pass null for $calendarId
     * to use the calendar flagged is_default.
     *
     * Returns 0 if $end is at or before $start (never negative).
     */
    public function minutesBetween(CarbonInterface $start, CarbonInterface $end, ?int $calendarId = null): int
    {
        $timezone = config('app.display_timezone', 'Asia/Manila');

        $start = Carbon::instance($start)->clone()->setTimezone($timezone);
        $end   = Carbon::instance($end)->clone()->setTimezone($timezone);

        if ($end->lessThanOrEqualTo($start)) {
            return 0;
        }

        $calendar = $this->resolveCalendar($calendarId);
        $weeklyHours = $calendar->weekly_hours ?? [];

        $holidayDates = $calendar->holidays()
            ->whereBetween('date', [$start->toDateString(), $end->toDateString()])
            ->pluck('date')
            ->map(fn ($date) => Carbon::parse($date)->toDateString())
            ->flip(); // O(1) lookup below

        $totalMinutes = 0;
        $cursor = $start->clone()->startOfDay();
        $daysWalked = 0;

        while ($cursor->lessThanOrEqualTo($end)) {
            if (++$daysWalked > self::MAX_DAYS) {
                throw new RuntimeException(
                    'BusinessCalendarService::minutesBetween exceeded '.self::MAX_DAYS.
                    ' days — check that $start/$end are real, close-together instants.'
                );
            }

            $dayKey = strtolower($cursor->format('l'));
            $hours  = $weeklyHours[$dayKey] ?? null;
            $isHoliday = isset($holidayDates[$cursor->toDateString()]);

            if ($hours !== null && !$isHoliday && !empty($hours['open']) && !empty($hours['close'])) {
                $open  = $cursor->clone()->setTimeFromTimeString($hours['open']);
                $close = $cursor->clone()->setTimeFromTimeString($hours['close']);

                // Overnight windows (close <= open, e.g. an office spanning
                // midnight) aren't supported yet — skip rather than
                // silently produce a negative/garbage window. None of the
                // university's current offices need this.
                if ($close->greaterThan($open)) {
                    $windowStart = $open->greaterThan($start) ? $open : $start;
                    $windowEnd   = $close->lessThan($end) ? $close : $end;

                    if ($windowEnd->greaterThan($windowStart)) {
                        $totalMinutes += $windowStart->diffInMinutes($windowEnd);
                    }
                }
            }

            $cursor->addDay();
        }

        return $totalMinutes;
    }

    /**
     * Whether $at falls inside $calendarId's office hours right now, and —
     * if not — the next instant it will. Powers the public "we're
     * open/closed" notice on the student request form (Step 4): a request
     * filed at 11 PM should tell the requester when processing will
     * actually begin, using the same calendar/holiday rules minutesBetween()
     * already applies to SLA timing, so the two never disagree.
     *
     * Returns:
     *   - is_open: bool
     *   - next_open_at: CarbonInterface|null — null when is_open is true
     *   - closes_at: CarbonInterface|null — null when is_open is false
     *
     * Overnight windows (close <= open) are skipped, same restriction as
     * minutesBetween() — no current office needs one.
     */
    public function currentStatus(CarbonInterface $at, ?int $calendarId = null): array
    {
        $timezone = config('app.display_timezone', 'Asia/Manila');
        $at = Carbon::instance($at)->clone()->setTimezone($timezone);

        $calendar = $this->resolveCalendar($calendarId);
        $weeklyHours = $calendar->weekly_hours ?? [];

        $rangeStart = $at->clone()->startOfDay();
        $rangeEnd   = $rangeStart->clone()->addDays(self::MAX_LOOKAHEAD_DAYS);

        $holidayDates = $calendar->holidays()
            ->whereBetween('date', [$rangeStart->toDateString(), $rangeEnd->toDateString()])
            ->pluck('date')
            ->map(fn ($date) => Carbon::parse($date)->toDateString())
            ->flip();

        $windowFor = function (CarbonInterface $day) use ($weeklyHours, $holidayDates) {
            $dayKey = strtolower($day->format('l'));
            $hours  = $weeklyHours[$dayKey] ?? null;

            if (!$hours || empty($hours['open']) || empty($hours['close'])) {
                return null;
            }
            if (isset($holidayDates[$day->toDateString()])) {
                return null;
            }

            $open  = $day->clone()->setTimeFromTimeString($hours['open']);
            $close = $day->clone()->setTimeFromTimeString($hours['close']);

            return $close->greaterThan($open) ? ['open' => $open, 'close' => $close] : null;
        };

        // Currently inside today's window?
        $todayWindow = $windowFor($at);
        if ($todayWindow && $at->greaterThanOrEqualTo($todayWindow['open']) && $at->lessThan($todayWindow['close'])) {
            return [
                'is_open'      => true,
                'next_open_at' => null,
                'closes_at'    => $todayWindow['close'],
            ];
        }

        // Not open now — walk forward for the next day whose window hasn't
        // started yet (covers "before opening today" and "after closing /
        // weekend / holiday" in one pass).
        $cursor = $rangeStart->clone();
        for ($i = 0; $i <= self::MAX_LOOKAHEAD_DAYS; $i++) {
            $window = $windowFor($cursor);
            if ($window && $window['open']->greaterThan($at)) {
                return [
                    'is_open'      => false,
                    'next_open_at' => $window['open'],
                    'closes_at'    => null,
                ];
            }
            $cursor = $cursor->addDay();
        }

        throw new RuntimeException(
            'No open day found within '.self::MAX_LOOKAHEAD_DAYS." days for calendar '{$calendar->name}'".
            ' — check its weekly_hours/holidays configuration.'
        );
    }

    /**
     * The calendar every office falls back to until it's given its own.
     * Cached per-instance — call site should reuse one service instance
     * rather than constructing a fresh one per row when processing a batch.
     */
    public function defaultCalendar(): BusinessCalendar
    {
        return $this->resolveCalendar(null);
    }

    private function resolveCalendar(?int $calendarId): BusinessCalendar
    {
        $cacheKey = $calendarId ?? 0;

        if (isset($this->calendarCache[$cacheKey])) {
            return $this->calendarCache[$cacheKey];
        }

        $calendar = $calendarId !== null
            ? BusinessCalendar::find($calendarId)
            : BusinessCalendar::where('is_default', true)->first();

        if (!$calendar) {
            throw $calendarId !== null
                ? new InvalidArgumentException("No business calendar found with id {$calendarId}.")
                : new RuntimeException('No default business calendar is configured (business_calendars.is_default).');
        }

        return $this->calendarCache[$cacheKey] = $calendar;
    }
}