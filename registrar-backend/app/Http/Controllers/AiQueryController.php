<?php

namespace App\Http\Controllers;

use App\Services\AiConversationService;
use App\Services\AnalyticsService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;

/**
 * AiQueryController
 *
 * Handles POST /analytics/ai-query — the Phase 3 conversational NLQ endpoint.
 *
 * Request body (JSON)
 * -------------------
 * {
 *   "question": "Which document type had the longest processing time?",
 *   "history":  [                          // optional; omit for first turn
 *     { "role": "user",      "content": "…" },
 *     { "role": "assistant", "content": "…" }
 *   ],
 *   "range":    "month",                   // optional; same values as other endpoints
 *   "from":     "2025-01-01",              // optional; only when range=custom
 *   "to":       "2025-03-31"               // optional; only when range=custom
 * }
 *
 * Response body (JSON)
 * --------------------
 * {
 *   "answer":       "string",
 *   "history":      [ … ],   // full updated history; pass this back on the next turn
 *   "generated_at": "ISO8601"
 * }
 *
 * Rate limiting
 * -------------
 * Throttled at 10 requests/minute per authenticated user (applied in routes/api.php).
 * This is separate from — and tighter than — the 60 req/min group limit on
 * other analytics endpoints, because each call costs an Anthropic API credit.
 *
 * Conversation history validation
 * --------------------------------
 * History is validated to ensure it contains only 'user' / 'assistant' roles
 * and string content, capped at MAX_HISTORY_TURNS to keep token costs bounded.
 */
class AiQueryController extends Controller
{
    /** Maximum prior turns accepted from the client. */
    private const MAX_HISTORY_TURNS = 20;

    public function __construct(
        private AiConversationService $conversation,
        private AnalyticsService      $analytics,
    ) {}

    public function query(Request $request)
    {
        // ── Validate ──────────────────────────────────────────────────────────
        $validated = $request->validate([
            'question'          => [
                'required', 'string',
                'min:1',
                'max:' . AiConversationService::MAX_INPUT_LENGTH,
            ],
            'history'           => ['sometimes', 'array', 'max:' . self::MAX_HISTORY_TURNS],
            'history.*.role'    => ['required_with:history', 'in:user,assistant'],
            'history.*.content' => ['required_with:history', 'string', 'max:8000'],
            'range'             => ['sometimes', 'string', 'in:today,week,month,year,all,custom'],
            'from'              => ['sometimes', 'nullable', 'date_format:Y-m-d'],
            'to'                => ['sometimes', 'nullable', 'date_format:Y-m-d', 'after_or_equal:from'],
        ]);

        // ── Build date range (reuse same logic as AnalyticsController) ────────
        $rangeKey = $validated['range'] ?? 'month';

        if ($rangeKey === 'custom') {
            $from = now()->parse($validated['from'] ?? now()->startOfMonth()->toDateString())->startOfDay();
            $to   = now()->parse($validated['to']   ?? now()->toDateString())->endOfDay();
        } else {
            $to   = now();
            $from = match ($rangeKey) {
                'today' => now()->startOfDay(),
                'week'  => now()->startOfWeek(),
                'year'  => now()->startOfYear(),
                'all'   => now()->subYears(100),
                default  => now()->startOfMonth(),
            };
        }

        $history = $validated['history'] ?? [];

        try {
            $result = $this->conversation->ask(
                $history,
                $validated['question'],
                [$from, $to],
            );

            return response()->json([
                'answer'       => $result['answer'],
                'history'      => $result['history'],
                'generated_at' => now()->toIso8601String(),
            ]);

        } catch (\RuntimeException $e) {
            return response()->json(['error' => $e->getMessage()], 502);
        }
    }
}
