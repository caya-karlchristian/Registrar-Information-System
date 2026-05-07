<?php

namespace App\Http\Controllers;

use App\Services\AnalyticsService;
use App\Services\AnthropicService;
use Illuminate\Http\Request;

/**
 * Analytics HTTP adapter.
 *
 * Responsibilities: parse the ?range query param, delegate to
 * AnalyticsService, return JSON. No raw SQL lives here.
 */
class AnalyticsController extends Controller
{
    public function __construct(
        private AnalyticsService  $analytics,
        private AnthropicService  $anthropic,
    ) {}

    // -------------------------------------------------------
    // Shared date-range parser
    // Accepts ?range=today|week|month|year|all (default: month)
    // Returns [Carbon $from, Carbon $to]
    // -------------------------------------------------------
    private function dateRange(Request $request): array
    {
        $to   = now();
        $from = match ($request->query('range', 'month')) {
            'today' => now()->startOfDay(),
            'week'  => now()->startOfWeek(),
            'year'  => now()->startOfYear(),
            'all'   => now()->subYears(100),   // full history, not arbitrary 10 yrs
            default => now()->startOfMonth(),
        };
        return [$from, $to];
    }

    public function overview(Request $request)
    {
        return response()->json($this->analytics->overview($this->dateRange($request)));
    }

    public function volumeTrend(Request $request)
    {
        return response()->json($this->analytics->volumeTrend($this->dateRange($request)));
    }

    public function byDocumentType(Request $request)
    {
        return response()->json($this->analytics->byDocumentType($this->dateRange($request)));
    }

    public function byStatus(Request $request)
    {
        return response()->json($this->analytics->byStatus($this->dateRange($request)));
    }

    public function processingTime(Request $request)
    {
        return response()->json($this->analytics->processingTime($this->dateRange($request)));
    }

    public function peakHours(Request $request)
    {
        return response()->json($this->analytics->peakHours($this->dateRange($request)));
    }

    public function byPurpose(Request $request)
    {
        return response()->json($this->analytics->byPurpose($this->dateRange($request)));
    }

    /**
     * POST /analytics/ai-report
     *
     * Collects all aggregated stats for the requested range, strips PII,
     * forwards the anonymised payload to the Claude API via AnthropicService,
     * and returns the generated narrative.
     *
     * The frontend never talks to the Claude API directly — this controller
     * is the sole gateway, enforcing the security model from the blueprint.
     */
    public function aiReport(Request $request)
    {
        try {
            $range     = $this->dateRange($request);
            $payload   = $this->analytics->buildAiPayload($range);
            $narrative = $this->anthropic->generateAnalyticsNarrative($payload);

            return response()->json([
                'narrative'  => $narrative,
                'generated_at' => now()->toIso8601String(),
                'range' => [
                    'from' => $range[0]->toDateString(),
                    'to'   => $range[1]->toDateString(),
                ],
            ]);
        } catch (\RuntimeException $e) {
            return response()->json(['error' => $e->getMessage()], 502);
        }
    }
}
