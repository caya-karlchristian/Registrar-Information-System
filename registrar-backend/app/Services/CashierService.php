<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * CashierService
 *
 * Verifies an Official Receipt (OR) number against the PUP Taguig
 * Cashier System API before a document request is submitted.
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
class CashierService
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
     */
    public function formatCustomerName(
        string $lastName,
        string $firstName,
        string $middleName = '',
        string $suffix     = '',
    ): string {
        $middleInitial = trim($middleName) !== ''
            ? strtoupper(mb_substr(trim($middleName), 0, 1)) . '.'
            : '';

        $parts = array_filter([
            trim($firstName),
            $middleInitial,
            trim($suffix) ? rtrim(strtoupper(trim($suffix)), '.') . '.' : '',
        ]);

        $givenNames = implode(' ', $parts);

        return strtoupper(trim($lastName)) . ', ' . strtoupper($givenNames);
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