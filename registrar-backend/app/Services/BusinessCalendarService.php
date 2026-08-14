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
 * each external signing office's turnaround metric.
 *
 * Rather than raw wall-clock diffInMinutes(), every SLA calculation should
 * route through minutesBetween() here, which only counts minutes that fall
 * inside the relevant calendar's open hours for that day. A request filed
 * Friday at 9 PM doesn't start accumulating processing time until
 * Monday's opening; a request filed at 11 PM on a Tuesday doesn't count
 * until the next morning.
 *
 * A given local calendar day can be closed for three different reasons,
 * checked in this order (most specific wins):
 *   1. A dated exception (business_calendar_holidays) — a declared holiday,
 *      suspension, or one-off event (fumigation, team-building). Always
 *      wins, even if it lands on a day that would otherwise be open.
 *   2. A recurring override (business_calendar_overrides) — a time-bound
 *      rule like "closed every Monday, effective <date>, until further
 *      notice." Only consulted when no dated exception applies.
 *   3. The calendar's baseline weekly_hours — the normal Mon-Fri schedule.
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

    /** @var array<int, \Illuminate\Support\Collection> */
    private array $exceptionsCache = [];

    /** @var array<int, \Illuminate\Support\Collection> */
    private array $overridesCache = [];

    /**
     * Hard ceiling on how many calendar days a single minutesBetween() call
     * will walk. A legitimate SLA window is days, not years — this guards
     * against a bad/garbage $start (e.g. a null-object epoch date) turning
     * into an effectively infinite loop.
     */
    private const MAX_DAYS = 3660; // ~10 years

    /**
     * How many days ahead currentStatus() / upcomingClosures() will search
     * before giving up. A calendar with no open day inside a month is
     * almost certainly a config error (weekly_hours all null, or an
     * exception range accidentally covering everything), not a real
     * closure.
     */
    private const MAX_LOOKAHEAD_DAYS = 30;

    /**
     * Business minutes elapsed between $start and $end, counting only
     * minutes that fall inside $calendarId's open hours for that day (see
     * class docblock for the exception -> override -> baseline precedence).
     * Pass null for $calendarId to use the calendar flagged is_default.
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

        $exceptions = $this->exceptionsOverlapping($calendar, $start, $end);
        $overrides  = $this->activeOverrides($calendar, $start, $end);

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

            $hours = $this->closed($cursor, $exceptions, $overrides)
                ? null
                : ($weeklyHours[strtolower($cursor->format('l'))] ?? null);

            if ($hours !== null && !empty($hours['open']) && !empty($hours['close'])) {
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
     * open/closed" notice on the student request form: a request filed at
     * 11 PM (or on a suspension day, or a WFH Monday) should tell the
     * requester when processing will actually begin and, when known, why
     * it's closed — using the same rules minutesBetween() applies to SLA
     * timing, so the two never disagree.
     *
     * Returns:
     *   - is_open: bool
     *   - next_open_at: CarbonInterface|null — null when is_open is true
     *   - closes_at: CarbonInterface|null — null when is_open is false
     *   - reason: string|null — the exception/override label causing
     *     closure right now, e.g. "Mosquito fogging" or "WFH Monday."
     *     Null when closed simply because it's outside normal weekly
     *     hours (a plain weekend/evening) — nothing "unusual" to explain.
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

        $exceptions = $this->exceptionsOverlapping($calendar, $rangeStart, $rangeEnd);
        $overrides  = $this->activeOverrides($calendar, $rangeStart, $rangeEnd);

        $windowFor = function (CarbonInterface $day) use ($weeklyHours, $exceptions, $overrides) {
            if ($this->closed($day, $exceptions, $overrides)) {
                return null;
            }

            $hours = $weeklyHours[strtolower($day->format('l'))] ?? null;
            if (!$hours || empty($hours['open']) || empty($hours['close'])) {
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
                'reason'       => null,
            ];
        }

        // Not open now — walk forward for the next day whose window hasn't
        // started yet (covers "before opening today" and "after closing /
        // weekend / exception / override" in one pass).
        $cursor = $rangeStart->clone();
        for ($i = 0; $i <= self::MAX_LOOKAHEAD_DAYS; $i++) {
            $window = $windowFor($cursor);
            if ($window && $window['open']->greaterThan($at)) {
                return [
                    'is_open'      => false,
                    'next_open_at' => $window['open'],
                    'closes_at'    => null,
                    'reason'       => $this->closureLabel($at, $exceptions, $overrides),
                ];
            }
            $cursor = $cursor->addDay();
        }

        throw new RuntimeException(
            'No open day found within '.self::MAX_LOOKAHEAD_DAYS." days for calendar '{$calendar->name}'".
            ' — check its weekly_hours/exceptions/overrides configuration.'
        );
    }

    /**
     * Every dated exception and active override day within the next $days,
     * merged and sorted — the data source for a "heads up, we're closed on
     * these upcoming dates" banner. Distinct from currentStatus(), which
     * only answers "right now." Each entry:
     *   ['date' => 'Y-m-d', 'label' => string, 'type' => 'holiday'|'suspension'|'event'|'recurring']
     */
    public function upcomingClosures(CarbonInterface $from, int $days = 14, ?int $calendarId = null): array
    {
        $timezone = config('app.display_timezone', 'Asia/Manila');
        $from = Carbon::instance($from)->clone()->setTimezone($timezone)->startOfDay();
        $to   = $from->clone()->addDays($days);

        $calendar = $this->resolveCalendar($calendarId);
        $exceptions = $this->exceptionsOverlapping($calendar, $from, $to);
        $overrides  = $this->activeOverrides($calendar, $from, $to);

        $closures = [];
        $cursor = $from->clone();

        while ($cursor->lessThanOrEqualTo($to)) {
            $exception = $this->exceptionFor($cursor, $exceptions);

            if ($exception) {
                $closures[] = [
                    'date'  => $cursor->toDateString(),
                    'label' => $exception->label,
                    'type'  => $exception->type,
                ];
            } elseif ($override = $this->overrideFor($cursor, $overrides)) {
                if ($override->is_closed) {
                    $closures[] = [
                        'date'  => $cursor->toDateString(),
                        'label' => $override->label,
                        'type'  => 'recurring',
                    ];
                }
            }

            $cursor->addDay();
        }

        return $closures;
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

    // -------------------------------------------------------
    // Internals
    // -------------------------------------------------------

    private function closed(CarbonInterface $day, $exceptions, $overrides): bool
    {
        if ($this->exceptionFor($day, $exceptions)) {
            return true;
        }

        $override = $this->overrideFor($day, $overrides);

        return $override !== null && $override->is_closed;
    }

    private function closureLabel(CarbonInterface $day, $exceptions, $overrides): ?string
    {
        if ($exception = $this->exceptionFor($day, $exceptions)) {
            return $exception->label;
        }

        $override = $this->overrideFor($day, $overrides);
        if ($override && $override->is_closed) {
            return $override->label;
        }

        return null; // plain weekend/evening — nothing unusual to explain
    }

    private function exceptionFor(CarbonInterface $day, $exceptions)
    {
        return $exceptions->first(fn ($exception) => $exception->coversDate($day));
    }

    private function overrideFor(CarbonInterface $day, $overrides)
    {
        return $overrides->first(fn ($override) => $override->appliesTo($day));
    }

    private function exceptionsOverlapping(BusinessCalendar $calendar, CarbonInterface $start, CarbonInterface $end)
    {
        // Loaded once per calendar and reused for the lifetime of this
        // service instance — see $exceptionsCache docblock above. $start/
        // $end are intentionally unused for scoping the query itself
        // (kept as parameters for readability at call sites and in case a
        // future caller wants a genuinely scoped variant); filtering by
        // date still happens per-day via coversDate() in exceptionFor().
        //
        // enabled=false is excluded here, at the single point every public
        // read (currentStatus, minutesBetween, upcomingClosures) funnels
        // through — a disabled closure must have zero effect on the
        // calendar, not just look inert in the admin list.
        return $this->exceptionsCache[$calendar->calendar_id]
            ??= $calendar->holidays()->where('enabled', true)->get();
    }

    private function activeOverrides(BusinessCalendar $calendar, CarbonInterface $start, CarbonInterface $end)
    {
        return $this->overridesCache[$calendar->calendar_id]
            ??= $calendar->overrides()->where('enabled', true)->get();
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