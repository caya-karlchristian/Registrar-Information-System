<?php

namespace App\Services;

use App\Contracts\CashierServiceInterface;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\Pool;
use Illuminate\Http\Client\Response as HttpResponse;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * CashierService
 *
 * Verifies an Official Receipt (OR) number against the PUP Taguig
 * Cashier System API before a document request is submitted.
 *
 * Implements CashierServiceInterface — consumers (DocumentRequestController,
 * etc.) should depend on that interface, not this concrete class, so a
 * future swap (different provider, fake for local dev, etc.) is a single
 * binding change in AppServiceProvider. See the interface's docblock for
 * the full rationale.
 *
 * Mock mode
 * ---------
 * When CASHIER_API_KEY is blank or absent, the service returns a mock
 * "valid" response so development and testing can proceed without a
 * real OR number.  Set the key in .env to enable live verification.
 *
 * API contract (external)
 * -----------------------
 * POST https://puptec.ojt-ims-bsit.net/api/verify-payment
 * Authorization: Bearer <CASHIER_API_KEY>
 * Body: { "or_no": "1048185", "customer_name": "DELA CRUZ, JUAN SANTOS" }
 *
 * Success:  { "valid": true,  "reason": null, "data": { ... } }
 * Failure:  { "valid": false, "reason": "NOT_FOUND" }
 */
class CashierService implements CashierServiceInterface
{
    private const TIMEOUT = 10; // seconds

    private string $apiKey;
    private string $apiUrl;

    public function __construct()
    {
        $this->apiKey = config('services.cashier.api_key', '');
        $this->apiUrl = config('services.cashier.url', 'https://puptec.ojt-ims-bsit.net/api/verify-payment');
    }

    // -------------------------------------------------------------------------
    // Public API
    // -------------------------------------------------------------------------

    /**
     * Verify an OR number against the cashier system.
     *
     * @param  string $orNo         The OR number from the request form
     * @param  string $customerName Formatted name: "LASTNAME, FIRSTNAME MIDDLENAME"
     * @return array  {
     *     valid: bool,
     *     reason: string|null,   // 'NOT_FOUND', 'API_ERROR', or null on success
     *     data:   array|null,    // receipt data on success, null on failure
     * }
     */
    public function verifyPayment(string $orNo, string $customerName): array
    {
        if (empty($this->apiKey)) {
            return $this->mockResponse($orNo, $customerName);
        }

        try {
            $response = Http::withToken($this->apiKey)
                ->timeout(self::TIMEOUT)
                ->post($this->apiUrl, [
                    'or_no'         => $orNo,
                    'customer_name' => $customerName,
                ]);

            if ($response->serverError()) {
                Log::error('CashierService: API server error', [
                    'status' => $response->status(),
                    'body'   => $response->body(),
                ]);
                return [
                    'valid'  => false,
                    'reason' => 'API_ERROR',
                    'data'   => null,
                ];
            }

            $body = $response->json();

            return [
                'valid'  => $body['valid']  ?? false,
                'reason' => $body['reason'] ?? null,
                'data'   => $body['data']   ?? null,
            ];

        } catch (\Illuminate\Http\Client\ConnectionException $e) {
            Log::error('CashierService: Connection failed', [
                'message' => $e->getMessage(),
            ]);
            return [
                'valid'  => false,
                'reason' => 'API_ERROR',
                'data'   => null,
            ];
        }
    }

    /**
     * Verify an OR number, trying several candidate customer-name
     * formattings — the first alone, then (only if needed) the rest
     * CONCURRENTLY via Http::pool().
     *
     * Why this exists
     * ----------------
     * NameMatcher::candidatesFor() can return up to MAX_CANDIDATES (16)
     * plausible name formattings for the same person, because the
     * cashier system's "Customer Name" field is free text an admin
     * typed by hand (see NameMatcher's class docblock). The original
     * caller-side retry loop tried these ONE AT A TIME, waiting up to
     * TIMEOUT seconds for each before moving to the next. For a genuine
     * name mismatch — the common failure case the retry loop exists to
     * solve, not a rare edge case — that meant up to MAX_CANDIDATES
     * sequential round trips, each paying the full timeout, on a single
     * "Next" click. Reported by users as OR verification "taking a long
     * time".
     *
     * Two-phase design — this is deliberately NOT "just pool everything"
     * ---------------------------------------------------------------
     * An earlier version of this method pooled all candidates at once.
     * That fixed the reported slowness but introduced a real regression:
     * it turned every verification — including the common case where the
     * primary name format already matches — into N concurrent calls
     * instead of 1, and it meant a genuine name mismatch during a
     * Cashier API outage would fire up to MAX_CANDIDATES calls at an
     * already-struggling third-party system instead of failing fast
     * after one. Splitting into two phases keeps both of those cases
     * exactly as cheap as the original sequential code:
     *
     *   Phase 1 — try ONLY the single most-likely candidate, via the
     *   existing single-call verifyPayment(). This is the fast path for
     *   the common outcomes:
     *     - primary format matches → 1 call total, same as before.
     *     - Cashier API is down (API_ERROR) → 1 call total, fails fast,
     *       exactly like the old loop's early-exit did. Phase 2 is never
     *       reached, so an outage never gets amplified into a burst of
     *       calls.
     *
     *   Phase 2 — only entered once Phase 1 comes back as a genuine
     *   NOT_FOUND (the API is reachable, it just doesn't recognise the
     *   primary format). From here every remaining candidate is a real
     *   guess and this is exactly the slow path users reported, so the
     *   remaining candidates are run concurrently instead of
     *   sequentially, bounding the cost to roughly one more round trip
     *   regardless of how many candidates are left.
     *
     * Priority order is preserved throughout: if more than one candidate
     * would match, the earliest one in $customerNames wins, matching the
     * semantics the old sequential loop had.
     *
     * Mock mode (no CASHIER_API_KEY configured) never touches the
     * network — verifyPayment() short-circuits to the mock response on
     * the very first call, so Phase 2 is never reached and behaviour is
     * unchanged from before.
     *
     * @param  string   $orNo           The OR number from the request form
     * @param  string[] $customerNames  Candidate name formattings, in priority order
     * @return array{
     *     valid:        bool,
     *     reason:       string|null,
     *     data:         array|null,
     *     matched_name: string|null,
     *     attempts:     array<int, array{name: string, valid: bool, reason: string|null}>,
     * }
     */
    public function verifyPaymentAny(string $orNo, array $customerNames): array
    {
        $customerNames = array_values(array_filter(
            $customerNames,
            static fn (string $name): bool => trim($name) !== ''
        ));

        if ($customerNames === []) {
            return [
                'valid'        => false,
                'reason'       => 'NOT_FOUND',
                'data'         => null,
                'matched_name' => null,
                'attempts'     => [],
            ];
        }

        // -------------------------------------------------------------
        // Phase 1 — single call, the primary (most-likely) format only.
        // Covers the happy path and the outage path at the same cost as
        // the original sequential implementation. See docblock above.
        // -------------------------------------------------------------
        $primary        = $customerNames[0];
        $primaryAttempt = $this->verifyPayment($orNo, $primary);

        $attempts = [[
            'name'   => $primary,
            'valid'  => $primaryAttempt['valid'],
            'reason' => $primaryAttempt['reason'] ?? null,
        ]];

        if ($primaryAttempt['valid']) {
            return [
                'valid'        => true,
                'reason'       => null,
                'data'         => $primaryAttempt['data'] ?? null,
                'matched_name' => $primary,
                'attempts'     => $attempts,
            ];
        }

        // API_ERROR won't be fixed by a different name string, and — same
        // reasoning as the old loop — firing more calls at a system
        // that's already failing infrastructurally would only add load
        // to an outage, not resolve it. Bail out here, exactly as before.
        if (($primaryAttempt['reason'] ?? null) === 'API_ERROR') {
            return [
                'valid'        => false,
                'reason'       => 'API_ERROR',
                'data'         => null,
                'matched_name' => null,
                'attempts'     => $attempts,
            ];
        }

        $remaining = array_slice($customerNames, 1);

        if ($remaining === []) {
            return [
                'valid'        => false,
                'reason'       => 'NOT_FOUND',
                'data'         => null,
                'matched_name' => null,
                'attempts'     => $attempts,
            ];
        }

        // -------------------------------------------------------------
        // Phase 2 — the primary format was a genuine miss (confirmed
        // reachable API, NOT_FOUND). Every remaining candidate here is a
        // real guess, so run them concurrently instead of sequentially —
        // this is the actual slow path being fixed. Pool keys are the
        // array index (not the name string) so this stays correct even
        // in the unexpected case of two identical candidate strings.
        // -------------------------------------------------------------
        $responses = Http::pool(fn (Pool $pool) => collect($remaining)
            ->map(fn (string $candidate, int $index) => $pool
                ->as($index)
                ->withToken($this->apiKey)
                ->timeout(self::TIMEOUT)
                ->post($this->apiUrl, [
                    'or_no'         => $orNo,
                    'customer_name' => $candidate,
                ]))
            ->all());

        $parsed = [];

        foreach ($remaining as $index => $candidate) {
            $result = $this->parsePoolResult($responses[$index] ?? null);

            $attempts[] = [
                'name'   => $candidate,
                'valid'  => $result['valid'],
                'reason' => $result['reason'],
            ];

            $parsed[$index] = $result;
        }

        foreach ($remaining as $index => $candidate) {
            if ($parsed[$index]['valid']) {
                return [
                    'valid'        => true,
                    'reason'       => null,
                    'data'         => $parsed[$index]['data'],
                    'matched_name' => $candidate,
                    'attempts'     => $attempts,
                ];
            }
        }

        // Only report the overall failure as an outage (API_ERROR) if
        // every Phase 2 attempt failed for infrastructure reasons. A mix
        // of API_ERROR and NOT_FOUND means the API is reachable and
        // simply didn't recognise any candidate — that's a lookup miss,
        // not an outage, and should surface to the user as NOT_FOUND.
        $allApiErrors = collect($parsed)->every(
            static fn (array $r): bool => $r['reason'] === 'API_ERROR'
        );

        return [
            'valid'        => false,
            'reason'       => $allApiErrors ? 'API_ERROR' : 'NOT_FOUND',
            'data'         => null,
            'matched_name' => null,
            'attempts'     => $attempts,
        ];
    }

    /**
     * Normalize one slot of an Http::pool() result into the same shape
     * verifyPayment() returns for a single call.
     *
     * Http::pool() never throws for an individual request's connection
     * failure — instead the corresponding slot in the returned array
     * holds the Illuminate\Http\Client\ConnectionException object itself
     * in place of a Response, so one slow/broken candidate can't take
     * down the rest of the pool. Any other unexpected slot type is
     * treated the same as a connection failure defensively, rather than
     * risking an uncaught error on a third-party response shape this
     * code doesn't control.
     */
    private function parsePoolResult(mixed $response): array
    {
        if ($response instanceof ConnectionException) {
            Log::error('CashierService: Connection failed (pool)', [
                'message' => $response->getMessage(),
            ]);

            return ['valid' => false, 'reason' => 'API_ERROR', 'data' => null];
        }

        if (!$response instanceof HttpResponse) {
            Log::error('CashierService: Unexpected pool result type', [
                'type' => get_debug_type($response),
            ]);

            return ['valid' => false, 'reason' => 'API_ERROR', 'data' => null];
        }

        if ($response->serverError()) {
            Log::error('CashierService: API server error (pool)', [
                'status' => $response->status(),
                'body'   => $response->body(),
            ]);

            return ['valid' => false, 'reason' => 'API_ERROR', 'data' => null];
        }

        $body = $response->json();

        return [
            'valid'  => $body['valid']  ?? false,
            'reason' => $body['reason'] ?? null,
            'data'   => $body['data']   ?? null,
        ];
    }

    /**
     * Format a user's name to match the cashier API convention.
     * Pattern: "LASTNAME, FIRSTNAME MIDDLEINITIAL. SUFFIX" — all uppercase.
     *
     * The cashier system stores names with an abbreviated middle initial,
     * not the full middle name — confirmed against the Cashier System API
     * doc's own examples (e.g. "MENDOZA, SABENIANO JAMES MARTIN A.") and by
     * direct reproduction: the same OR number returns valid:true with a
     * middle-initial name and valid:false/NOT_FOUND with the full middle
     * name. Sending the full middle name causes real, valid OR numbers to
     * be rejected as "not found" — see incident 2026-08-11.
     *
     * Examples:
     *   Dela Cruz / Juan  / Santos / ""   → "DELA CRUZ, JUAN S."
     *   Guevarra  / Pedro / ""     / "Jr" → "GUEVARRA, PEDRO JR."
     *
     * Uses mb_strtoupper() (not strtoupper()), because PHP's plain
     * strtoupper() only uppercases plain ASCII a-z and silently leaves
     * accented/multibyte characters untouched — so a name like "Muñoz"
     * would come out as "MUñOZ", a string that will never match either a
     * cashier admin who correctly typed "MUÑOZ" or one who dropped the
     * tilde to "MUNOZ". mb_strtoupper() with an explicit UTF-8 encoding
     * uppercases ñ, é, ü, etc. correctly, matching how a human would
     * capitalize the name.
     */
    public function formatCustomerName(
        string $lastName,
        string $firstName,
        string $middleName = '',
        string $suffix     = '',
    ): string {
        $middleInitial = trim($middleName) !== ''
            ? mb_strtoupper(mb_substr(trim($middleName), 0, 1), 'UTF-8') . '.'
            : '';

        $parts = array_filter([
            trim($firstName),
            $middleInitial,
            trim($suffix) ? rtrim(mb_strtoupper(trim($suffix), 'UTF-8'), '.') . '.' : '',
        ]);

        $givenNames = implode(' ', $parts);

        return mb_strtoupper(trim($lastName), 'UTF-8') . ', ' . mb_strtoupper($givenNames, 'UTF-8');
    }

    // -------------------------------------------------------------------------
    // Single-use enforcement
    // -------------------------------------------------------------------------

    /**
     * Check if an OR number has already been used in a previous request.
     *
     * Controlled by CASHIER_SINGLE_USE env flag:
     *   false (default) — always returns false (bypass for testing)
     *   true            — queries document_requests table for existing use
     *
     * @param  string   $orNo          The OR number to check
     * @param  int|null $excludeRequestId  Exclude this request ID (for updates)
     * @return bool  true if OR is already used and single-use is enforced
     */
    public function isOrAlreadyUsed(string $orNo, ?int $excludeRequestId = null): bool
    {
        if (!config('services.cashier.single_use', false)) {
            return false; // single-use not enforced — testing mode
        }

        $query = \App\Models\DocumentRequest::where('or_number', $orNo)
            ->whereNotNull('or_number');

        if ($excludeRequestId) {
            $query->where('request_id', '!=', $excludeRequestId);
        }

        return $query->exists();
    }

    // -------------------------------------------------------------------------
    // Private helpers
    // -------------------------------------------------------------------------

    /**
     * Mock response for development/testing when CASHIER_API_KEY is not set.
     * Always returns valid so the form can be submitted without a real OR.
     */
    private function mockResponse(string $orNo, string $customerName): array
    {
        Log::info('CashierService: Mock mode — bypassing OR verification', [
            'or_no'         => $orNo,
            'customer_name' => $customerName,
        ]);

        return [
            'valid'  => true,
            'reason' => null,
            'data'   => [
                'receipt_number'   => (int) $orNo,
                'customer_name'    => $customerName,
                'transaction_date' => now()->toDateTimeString(),
                'items'            => [],
                '_mock'            => true,
            ],
        ];
    }
}