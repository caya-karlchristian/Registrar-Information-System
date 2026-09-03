<?php

namespace App\Contracts;

/**
 * Contract for verifying an Official Receipt (OR) number against the
 * cashier system.
 *
 * Why this exists
 * ----------------
 * CashierService previously had no interface anywhere it was consumed
 * (DocumentRequestController depended on the concrete class directly),
 * unlike AlumniSystemClientInterface — which this app already uses
 * correctly to decouple alumni-data consumers from whichever concrete
 * client (real HTTP vs. fake) AppServiceProvider happens to bind.
 *
 * That inconsistency matters because the Cashier System is an external,
 * third-party API this app does not control (see CashierService's own
 * docblock for its API contract) — the exact kind of dependency that
 * historically changes shape or availability with little notice (this
 * codebase has already seen export-control-style access changes affect
 * other third-party integrations). If the Cashier API's provider,
 * authentication scheme, or transport ever changes, every direct
 * `new CashierService()` / concrete-class type-hint would need to be found
 * and updated one at a time. Depending on this interface instead means a
 * new implementation (e.g. a different cashier backend, or a fake for
 * local development that doesn't rely on the CASHIER_API_KEY-blank mock
 * path) is a single binding change in AppServiceProvider — no controller
 * or service needs to change.
 *
 * AppServiceProvider binds this to CashierService::class today. See that
 * class for the concrete implementation and its mock-mode behaviour.
 */
interface CashierServiceInterface
{
    /**
     * Verify an OR number against the cashier system.
     *
     * @param  string $orNo         The OR number from the request form
     * @param  string $customerName Formatted name: "LASTNAME, FIRSTNAME MIDDLEINITIAL."
     * @return array  {
     *     valid: bool,
     *     reason: string|null,   // 'NOT_FOUND', 'API_ERROR', or null on success
     *     data:   array|null,    // receipt data on success, null on failure
     * }
     */
    public function verifyPayment(string $orNo, string $customerName): array;

    /**
     * Verify an OR number against the cashier system, trying the primary
     * candidate name alone first and — only if that comes back as a
     * genuine NOT_FOUND rather than an API outage — the remaining
     * candidates CONCURRENTLY. See the concrete implementation's
     * docblock for the full two-phase rationale (it deliberately avoids
     * "just pool everything," to keep the common case and the outage
     * case exactly as cheap as the original sequential code).
     *
     * This exists alongside verifyPayment() rather than replacing it:
     * verifyPayment() is still the right tool for a single, known-name
     * check, remains covered by its own unit tests, and is reused
     * internally by this method for its first-candidate call. This
     * method is for the specific "try several plausible names for the
     * same OR" flow — see NameMatcher::candidatesFor() — where doing all
     * of the retries sequentially meant a genuine name mismatch (the
     * common failure case, not the exception) paid a full HTTP timeout
     * once per candidate, up to NameMatcher::MAX_CANDIDATES times in a
     * row, on a single user-facing "Next" click.
     *
     * @param  string   $orNo           The OR number from the request form
     * @param  string[] $customerNames  Candidate name formattings, in
     *                                  priority order (most-likely-correct
     *                                  first). The first candidate that
     *                                  the cashier system accepts is
     *                                  treated as the match, matching the
     *                                  priority semantics the old
     *                                  sequential retry loop had.
     * @return array{
     *     valid:        bool,
     *     reason:       string|null,   // 'NOT_FOUND', 'API_ERROR', or null on success
     *     data:         array|null,    // receipt data on success, null on failure
     *     matched_name: string|null,   // the candidate that succeeded, or null
     *     attempts:     array<int, array{name: string, valid: bool, reason: string|null}>,
     * }
     */
    public function verifyPaymentAny(string $orNo, array $customerNames): array;

    /**
     * Format a user's name to match the cashier API convention:
     * "LASTNAME, FIRSTNAME MIDDLEINITIAL. SUFFIX" — all uppercase.
     */
    public function formatCustomerName(
        string $lastName,
        string $firstName,
        string $middleName = '',
        string $suffix = '',
    ): string;

    /**
     * Check if an OR number has already been used on a previous request.
     * Governed by the CASHIER_SINGLE_USE config flag — see the concrete
     * implementation for the exact bypass behaviour when disabled.
     *
     * @param  string   $orNo              The OR number to check
     * @param  int|null $excludeRequestId  Exclude this request ID (for updates)
     */
    public function isOrAlreadyUsed(string $orNo, ?int $excludeRequestId = null): bool;
}