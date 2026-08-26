<?php

namespace App\Services;

use App\Models\DocumentType;
use App\Models\CertificationType;

/**
 * CashierDocumentMatcher
 *
 * Validates that what a student paid for at the cashier matches what they are
 * requesting in the RIS, with strict quantity enforcement.
 *
 * Responsibilities
 * ----------------
 * - Load cashier_document_patterns for each requested document/certificate type.
 * - For each requested item that has patterns (non-null), find a matching
 *   cashier receipt line whose `document` label matches any pattern
 *   (case-insensitive exact string match).
 * - Enforce quantity: the cashier receipt quantity must be >= the requested
 *   number of copies.
 * - Types with null patterns are skipped — the OR is already verified for
 *   existence and customer name by CashierService::verifyPayment().
 * - Return a structured result so the controller can surface per-item errors.
 *
 * This class is intentionally side-effect-free: no HTTP calls, no DB writes,
 * no exceptions. All outcomes are expressed in the returned MatchResult array.
 *
 * Usage
 * -----
 * $result = $this->matcher->match(
 *     cashierItems: $verification['data']['items'],   // from CashierService
 *     documents:    $validated['documents'] ?? [],    // [{document_type_id, number_of_copies}]
 *     certificates: $validated['certificates'] ?? [], // [{certificate_type_id, number_of_copies}]
 * );
 *
 * if (!$result['valid']) {
 *     return response()->json([
 *         'message' => $result['message'],
 *         'errors'  => $result['errors'],
 *     ], 422);
 * }
 */
class CashierDocumentMatcher
{
    /**
     * Match requested items against the cashier receipt.
     *
     * @param  array $cashierItems   items[] from the cashier API response
     *                               Each: { document: string, amount: string, quantity: int }
     * @param  array $documents      Validated document line-items from the request
     *                               Each: { document_type_id: int, number_of_copies: int }
     * @param  array $certificates   Validated certificate line-items from the request
     *                               Each: { certificate_type_id: int, number_of_copies: int }
     * @return array {
     *     valid:   bool,
     *     message: string,
     *     errors:  array<string, string[]>,   // field => [message] pairs
     * }
     */
    public function match(array $cashierItems, array $documents, array $certificates): array
    {
        // Normalise cashier items once: lowercase label → quantity.
        // When the same document label appears multiple times on one receipt,
        // sum the quantities (e.g. two separate line items for the same fee).
        $receiptIndex = $this->buildReceiptIndex($cashierItems);

        $errors = [];

        // ── Document types ────────────────────────────────────────────────────
        if (!empty($documents)) {
            $typeIds = array_column($documents, 'document_type_id');
            $types   = DocumentType::whereIn('document_type_id', $typeIds)
                ->get(['document_type_id', 'document_name', 'cashier_document_patterns'])
                ->keyBy('document_type_id');

            foreach ($documents as $item) {
                $typeId  = (int) $item['document_type_id'];
                $copies  = (int) ($item['number_of_copies'] ?? 1);
                $type    = $types->get($typeId);

                if (!$type) {
                    continue; // unknown type — caught earlier by exists: validation
                }

                $patterns = $this->decodePatterns($type->cashier_document_patterns);

                if ($patterns === null) {
                    continue; // no cashier equivalent — skip item check
                }

                $error = $this->checkItem(
                    label:        $type->document_name,
                    patterns:     $patterns,
                    requested:    $copies,
                    receiptIndex: $receiptIndex,
                    field:        "documents.{$typeId}",
                );

                if ($error !== null) {
                    $errors["documents.{$typeId}"] = [$error];
                }
            }
        }

        // ── Certificate types ─────────────────────────────────────────────────
        if (!empty($certificates)) {
            $typeIds = array_column($certificates, 'certificate_type_id');
            $types   = CertificationType::whereIn('certificate_type_id', $typeIds)
                ->get(['certificate_type_id', 'certificate_name', 'cashier_document_patterns'])
                ->keyBy('certificate_type_id');

            foreach ($certificates as $item) {
                $typeId  = (int) $item['certificate_type_id'];
                $copies  = (int) ($item['number_of_copies'] ?? 1);
                $type    = $types->get($typeId);

                if (!$type) {
                    continue;
                }

                $patterns = $this->decodePatterns($type->cashier_document_patterns);

                if ($patterns === null) {
                    continue;
                }

                $error = $this->checkItem(
                    label:        $type->certificate_name,
                    patterns:     $patterns,
                    requested:    $copies,
                    receiptIndex: $receiptIndex,
                    field:        "certificates.{$typeId}",
                );

                if ($error !== null) {
                    $errors["certificates.{$typeId}"] = [$error];
                }
            }
        }

        if (!empty($errors)) {
            return [
                'valid'   => false,
                'message' => $this->buildSummaryMessage($errors),
                'errors'  => $errors,
            ];
        }

        return [
            'valid'   => true,
            'message' => '',
            'errors'  => [],
        ];
    }

    // -------------------------------------------------------------------------
    // Private helpers
    // -------------------------------------------------------------------------

    /**
     * Build a normalised index of cashier receipt items.
     * Key: normalised document label (see normalise()).
     * Value: total quantity paid for that label across all line items.
     *
     * @param  array $items  Raw items[] from the cashier API
     * @return array<string, int>
     */
    /**
     * Normalise a cashier label for matching: lowercase, trim, collapse
     * internal whitespace, strip trailing punctuation.
     *
     * Deliberately kept IDENTICAL to CashierDocumentSuggester::normalise()
     * (see that class). The two used to diverge — this matcher did a bare
     * lowercase+trim while the suggester also collapsed whitespace and
     * stripped trailing punctuation — which meant a receipt line the
     * suggester happily pre-checked for the student could still fail this
     * strict check at final submit over nothing but a stray double-space
     * or trailing period in the cashier system's own copy of the label.
     * Still exact-match-after-normalisation, not fuzzy: this only forgives
     * formatting noise, never a different word.
     */
    private function normalise(string $label): string
    {
        $label = mb_strtolower(trim($label));
        $label = preg_replace('/\s+/', ' ', $label) ?? $label;
        $label = rtrim($label, " .,;:-");

        return trim($label);
    }

    private function buildReceiptIndex(array $items): array
    {
        $index = [];

        foreach ($items as $item) {
            $label = $this->normalise((string) ($item['document'] ?? ''));
            if ($label === '') {
                continue;
            }
            $qty = (int) ($item['quantity'] ?? 1);
            $index[$label] = ($index[$label] ?? 0) + $qty;
        }

        return $index;
    }

    /**
     * Decode cashier_document_patterns.
     *
     * With the 'array' cast on both models, Eloquent returns this as a PHP
     * array already. We still guard against null (skip) and the raw JSON
     * string case (defensive, in case the cast is bypassed via a raw query).
     *
     * Returns null if the type has no cashier patterns (skip item check).
     *
     * @param  mixed $raw  Raw value from the model attribute
     * @return string[]|null
     */
    private function decodePatterns(mixed $raw): ?array
    {
        if ($raw === null) {
            return null;
        }

        if (is_array($raw)) {
            return empty($raw) ? null : $raw;
        }

        // Fallback: raw JSON string (e.g. fetched via DB::table() raw query)
        $decoded = json_decode((string) $raw, true);

        if (!is_array($decoded) || empty($decoded)) {
            return null;
        }

        return $decoded;
    }

    /**
     * Check a single requested item against the receipt index.
     *
     * Matching is case-insensitive exact string match against each pattern.
     * The first pattern that finds a receipt entry with sufficient quantity wins.
     *
     * Returns null on success, or an error message string on failure.
     *
     * @param  string        $label        Human-readable RIS name for error messages
     * @param  string[]      $patterns     Cashier label strings to match against
     * @param  int           $requested    Number of copies requested
     * @param  array<string,int> $receiptIndex  Normalised receipt (lowercase label => qty)
     * @param  string        $field        Field key for error context (unused here,
     *                                     kept for future per-field logging)
     */
    private function checkItem(
        string $label,
        array  $patterns,
        int    $requested,
        array  $receiptIndex,
        string $field,
    ): ?string {
        $bestQuantityFound = 0;

        foreach ($patterns as $pattern) {
            $normalisedPattern = $this->normalise($pattern);
            $paidQty           = $receiptIndex[$normalisedPattern] ?? 0;

            if ($paidQty <= 0) {
                continue;
            }

            // Found a matching receipt line.
            if ($paidQty >= $requested) {
                return null; // valid — enough copies paid for
            }

            // Matched but insufficient quantity — track the best we found
            // so the error message is specific.
            if ($paidQty > $bestQuantityFound) {
                $bestQuantityFound = $paidQty;
            }
        }

        // No matching receipt line found at all.
        if ($bestQuantityFound === 0) {
            return "Your Official Receipt does not include payment for \"{$label}\". "
                . 'Please ensure you have paid for all requested documents at the Cashier\'s Office.';
        }

        // Matched but quantity is insufficient.
        return "Your Official Receipt shows payment for {$bestQuantityFound} "
            . ($bestQuantityFound === 1 ? 'copy' : 'copies')
            . " of \"{$label}\", but you requested {$requested}. "
            . 'Please pay for the correct number of copies at the Cashier\'s Office.';
    }

    /**
     * Build a single human-readable summary from all per-item errors.
     */
    private function buildSummaryMessage(array $errors): string
    {
        $count = count($errors);

        if ($count === 1) {
            return reset($errors)[0];
        }

        return "Your Official Receipt does not match your request for {$count} item(s). "
            . 'Please review the details below and ensure payment has been made for all requested documents.';
    }
}