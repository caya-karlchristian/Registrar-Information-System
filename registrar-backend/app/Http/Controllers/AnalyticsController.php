<?php

namespace App\Http\Controllers;

use App\Http\Requests\Analytics\AiReportRequest;
use App\Services\AnalyticsService;
use App\Services\AnthropicService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;

/**
 * Analytics HTTP adapter.
 *
 * Responsibilities: parse the ?range query param, delegate to
 * AnalyticsService, return JSON. No raw SQL lives here.
 *
 * Caching strategy
 * ----------------
 * Every analytics endpoint is cached in Redis for CACHE_TTL_MINUTES.
 * The AI report is cached separately for AI_CACHE_TTL_MINUTES because
 * it costs a real Anthropic API call.
 *
 * Cache keys include the range string so "today" and "month" are cached
 * independently. The cache is tagged with "analytics" so a single
 * Cache::tags(["analytics"])->flush() invalidates everything at once
 * (e.g. when an admin manually triggers a refresh).
 *
 * Note: Redis cache tags require the "redis" cache driver — they do NOT
 * work with the "file" driver. Ensure CACHE_STORE=redis in .env.
 */
class AnalyticsController extends Controller
{
    private const CACHE_TTL_MINUTES    = 10;
    private const AI_CACHE_TTL_MINUTES = 30;

    public function __construct(
        private AnalyticsService  $analytics,
        private AnthropicService  $anthropic,
    ) {}

    // -------------------------------------------------------
    // Shared date-range parser
    // Accepts ?range=today|week|month|year|all|custom (default: month)
    // For custom ranges: also accepts ?from=YYYY-MM-DD&to=YYYY-MM-DD
    // Returns [Carbon $from, Carbon $to]
    //
    // BUG FIX (QA #13 — "'No Prior Data' Despite History"): every boundary
    // below used bare now()->startOfDay()/startOfWeek()/startOfMonth()/
    // startOfYear(), which resolve in config('app.timezone') — UTC (see
    // config/app.php). That's 8 hours behind Asia/Manila (config('app.
    // display_timezone'), which every OTHER place in this codebase that
    // reasons about "what local day/hour did this happen on" already
    // uses — see BusinessCalendarService::minutesBetween() and
    // AnalyticsService::localExpression()'s docblock). So "Today" here
    // didn't mean the admin's actual today: at 7:59am Manila (still
    // "yesterday" in UTC), ?range=today would resolve $from to yesterday
    // 00:00 UTC = the day before yesterday, 8:00am Manila — an 8-hour-
    // shifted window that, especially checked first thing each morning
    // (exactly when staff open the dashboard), can easily land on a
    // slice of time with zero requests even though "today" and "the
    // previous period" both have real data just a few hours away. Same
    // shift applies to week/month/year at their respective boundaries.
    //
    // Fix: compute each boundary AS a local-timezone instant (so
    // startOfDay/Week/Month/Year truncate against the calendar day the
    // admin is actually in), then convert back to app.timezone (UTC)
    // before returning — Carbon represents an absolute instant either
    // way, but Laravel's query grammar formats bound parameters using
    // the Carbon object's OWN timezone, and the DB column is UTC, so
    // the returned instances must carry UTC or every query silently
    // reintroduces the same 8-hour offset in the other direction.
    // $to is unaffected — "now" is the same absolute instant regardless
    // of which timezone reads it.
    // -------------------------------------------------------
    private function dateRange(Request $request): array
    {
        $rangeKey       = $request->query('range', 'month');
        $displayTz      = config('app.display_timezone', 'Asia/Manila');
        $storageTz      = config('app.timezone', 'UTC');

        if ($rangeKey === 'custom') {
            $defaultFrom = now($displayTz)->startOfMonth()->toDateString();
            $defaultTo   = now($displayTz)->toDateString();

            $from = now($displayTz)->parse($request->query('from', $defaultFrom))->startOfDay()->setTimezone($storageTz);
            $to   = now($displayTz)->parse($request->query('to',   $defaultTo))->endOfDay()->setTimezone($storageTz);
            return [$from, $to];
        }

        $to   = now();
        $from = match ($rangeKey) {
            'today' => now($displayTz)->startOfDay()->setTimezone($storageTz),
            'week'  => now($displayTz)->startOfWeek()->setTimezone($storageTz),
            'year'  => now($displayTz)->startOfYear()->setTimezone($storageTz),
            'all'   => now()->subYears(100),
            default  => now($displayTz)->startOfMonth()->setTimezone($storageTz),
        };
        return [$from, $to];
    }

    /** Build a stable cache key from the request range params. */
    private function cacheKey(Request $request, string $endpoint): string
    {
        $range = $request->query('range', 'month');
        $from  = $request->query('from', '');
        $to    = $request->query('to',   '');
        return "analytics:{$endpoint}:{$range}:{$from}:{$to}";
    }

    /** Wrap a callable in a tagged Redis cache with the standard TTL. */
    private function cached(Request $request, string $endpoint, callable $fn): mixed
    {
        return Cache::tags(['analytics'])
            ->remember(
                $this->cacheKey($request, $endpoint),
                now()->addMinutes(self::CACHE_TTL_MINUTES),
                $fn,
            );
    }

    public function overview(Request $request)
    {
        // BUG FIX (QA #13): 'all' has no meaningful "previous period" —
        // see AnalyticsService::overview()'s doc block for why this is
        // passed through explicitly instead of just letting the
        // prev-period query run and come back empty.
        $rangeKey = $request->query('range', 'month');

        return response()->json(
            $this->cached($request, 'overview', fn () => $this->analytics->overview($this->dateRange($request), $rangeKey))
        );
    }

    public function volumeTrend(Request $request)
    {
        return response()->json(
            $this->cached($request, 'volume-trend', fn () => $this->analytics->volumeTrend($this->dateRange($request)))
        );
    }

    public function byDocumentType(Request $request)
    {
        return response()->json(
            $this->cached($request, 'by-doc-type', fn () => $this->analytics->byDocumentType($this->dateRange($request)))
        );
    }

    public function byStatus(Request $request)
    {
        return response()->json(
            $this->cached($request, 'by-status', fn () => $this->analytics->byStatus($this->dateRange($request)))
        );
    }

    public function processingTime(Request $request)
    {
        return response()->json(
            $this->cached($request, 'processing-time', fn () => $this->analytics->processingTime($this->dateRange($request)))
        );
    }

    /**
     * Registrar-controlled time vs. external-signatory time, split via the
     * PendingSignature status (see AnalyticsService::signatureTurnaroundTime).
     */
    public function signatureTurnaround(Request $request)
    {
        return response()->json(
            $this->cached($request, 'signature-turnaround', fn () => $this->analytics->signatureTurnaroundTime($this->dateRange($request)))
        );
    }

    public function peakHours(Request $request)
    {
        return response()->json(
            $this->cached($request, 'peak-hours', fn () => $this->analytics->peakHours($this->dateRange($request)))
        );
    }

    public function byPurpose(Request $request)
    {
        return response()->json(
            $this->cached($request, 'by-purpose', fn () => $this->analytics->byPurpose($this->dateRange($request)))
        );
    }

    /**
     * POST /analytics/ai-report
     *
     * Collects all aggregated stats for the requested range, strips PII,
     * forwards the anonymised payload to the Claude API via AnthropicService,
     * and returns the generated narrative.
     *
     * Cached for AI_CACHE_TTL_MINUTES (30 min) — Anthropic API calls cost money
     * and take ~5 seconds. Repeated clicks on "Generate Report" hit the cache.
     *
     * The frontend never talks to the Claude API directly — this controller
     * is the sole gateway, enforcing the security model from the blueprint.
     */
    public function aiReport(AiReportRequest $request)
    {
        try {
            $key = $this->cacheKey($request, 'ai-report');

            $result = Cache::tags(['analytics'])
                ->remember($key, now()->addMinutes(self::AI_CACHE_TTL_MINUTES), function () use ($request) {
                    $range     = $this->dateRange($request);
                    $payload   = $this->analytics->buildAiPayload($range);
                    $narrative = $this->anthropic->generateAnalyticsNarrative($payload);

                    return [
                        'narrative'    => $narrative,
                        'generated_at' => now()->toIso8601String(),
                        'range'        => [
                            'from' => $range[0]->toDateString(),
                            'to'   => $range[1]->toDateString(),
                        ],
                        'cached'       => false,
                    ];
                });

            // Mark subsequent responses as coming from cache so the UI can
            // show "Cached result — generated at X" if desired.
            $result['cached'] = Cache::tags(['analytics'])->has($key);

            return response()->json($result);

        } catch (\RuntimeException $e) {
            return response()->json(['error' => $e->getMessage()], 502);
        }
    }
}