<?php

namespace App\Http\Controllers;

use App\Services\SuperAdminAnalyticsService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;

/**
 * System-level analytics for the Super Admin dashboard — Phase 2 of the
 * Analytics & Audit Log Revamp plan. Separate controller from
 * AnalyticsController on purpose: that one answers "how is this
 * Registrar's request queue performing," this one answers "is the system
 * itself (roster, delegated access, cross-system verification) healthy."
 *
 * Route-gated role:4 only (see routes/api.php) — RoleMiddleware treats
 * Super Admin as a superset of every other role, so no additional
 * module: gate is needed the way admin-facing analytics needs
 * module:analytics.
 *
 * Caching mirrors AnalyticsController: Redis, tagged "analytics" so a
 * single Cache::tags(["analytics"])->flush() invalidates every analytics
 * panel (admin- and super-admin-facing) at once.
 */
class SuperAdminAnalyticsController extends Controller
{
    private const CACHE_TTL_MINUTES = 10;

    public function __construct(
        private SuperAdminAnalyticsService $superAdminAnalytics,
    ) {}

    // -------------------------------------------------------
    // Shared date-range parser — identical contract to
    // AnalyticsController::dateRange(). Duplicated rather than
    // extracted to a shared trait/base class for now: two call sites
    // sharing ~15 lines doesn't yet justify the indirection, and
    // AnalyticsController is not otherwise a natural parent for this
    // controller. Revisit if a third analytics controller needs the
    // same parsing.
    // -------------------------------------------------------
    private function dateRange(Request $request): array
    {
        $rangeKey = $request->query('range', 'month');

        if ($rangeKey === 'custom') {
            $from = now()->parse($request->query('from', now()->startOfMonth()->toDateString()))->startOfDay();
            $to   = now()->parse($request->query('to',   now()->toDateString()))->endOfDay();
            return [$from, $to];
        }

        $to   = now();
        $from = match ($rangeKey) {
            'today' => now()->startOfDay(),
            'week'  => now()->startOfWeek(),
            'year'  => now()->startOfYear(),
            'all'   => now()->subYears(100),
            default  => now()->startOfMonth(),
        };
        return [$from, $to];
    }

    private function cacheKey(Request $request, string $endpoint): string
    {
        $range = $request->query('range', 'month');
        $from  = $request->query('from', '');
        $to    = $request->query('to',   '');
        return "system-analytics:{$endpoint}:{$range}:{$from}:{$to}";
    }

    private function cached(Request $request, string $endpoint, callable $fn): mixed
    {
        return Cache::tags(['analytics'])
            ->remember(
                $this->cacheKey($request, $endpoint),
                now()->addMinutes(self::CACHE_TTL_MINUTES),
                $fn,
            );
    }

    /**
     * GET /system-analytics/admin-roster-health
     *
     * Not date-ranged (see SuperAdminAnalyticsService::adminRosterHealth
     * docblock) — cached under a fixed key rather than one that varies by
     * ?range, since the query params are irrelevant to this endpoint.
     */
    public function adminRosterHealth(Request $request)
    {
        return response()->json(
            Cache::tags(['analytics'])->remember(
                'system-analytics:admin-roster-health',
                now()->addMinutes(self::CACHE_TTL_MINUTES),
                fn () => $this->superAdminAnalytics->adminRosterHealth(),
            )
        );
    }

    public function accessRequestThroughput(Request $request)
    {
        return response()->json(
            $this->cached(
                $request,
                'access-request-throughput',
                fn () => $this->superAdminAnalytics->accessRequestThroughput($this->dateRange($request))
            )
        );
    }

    public function cashierVerificationHealth(Request $request)
    {
        return response()->json(
            $this->cached(
                $request,
                'cashier-verification-health',
                fn () => $this->superAdminAnalytics->cashierVerificationHealth($this->dateRange($request))
            )
        );
    }
}
