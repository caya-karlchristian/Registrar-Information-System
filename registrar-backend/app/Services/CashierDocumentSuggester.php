<?php

namespace App\Services;

use App\Enums\AccessType;
use App\Models\CertificationType;
use App\Models\DocumentType;
use Illuminate\Support\Facades\Log;

/**
 * CashierDocumentSuggester
 *
 * Soft-tier counterpart to CashierDocumentMatcher. Where the matcher asks
 * "does this type's patterns match the receipt?" (strict, money-facing gate,
 * runs at final submit — see CashierDocumentMatcher's own docblock), this
 * class asks the inverse question: "does this receipt line match any known
 * type?" — used to pre-populate the Documents step right after OR
 * verification, before the student has picked anything.
 *
 * This is a suggestion, not a decision. A wrong result here just means the
 * student unchecks a box; it never creates a request or blocks one. The
 * strict matcher still runs, unchanged, at final submit against whatever
 * the student actually confirmed — see CashierDocumentMatcher.
 *
 * Reuses the same `cashier_document_patterns` column on DocumentType /
 * CertificationType that the strict matcher reads — there is deliberately
 * no second mapping table. Two admin-maintained pattern lists that could
 * drift apart would be worse than one list serving two purposes.
 *
 * Scope: only document/certificate types visible to self-service students
 * and alumni (access_id 1, 2, or 3 — the union of RequestForm.jsx's
 * STUDENT_ACCESS_IDS [1,3] and AlumniRequest.jsx / useAlumniRequest.js's
 * ALUMNI_ACCESS_IDS [2,3]) and not archived. This suggester runs for both
 * students and alumni verifying an OR, so it must cover every type either
 * audience can actually select on their own form — narrowing to only the
 * student list here silently blinds the suggester (and the unmatched-item
 * queue) to every alumni-exclusive (access_id=2) type, no matter how many
 * times an admin resolves it.
 *
 * Matching is still case/whitespace/punctuation-normalised exact string
 * matching, same family of algorithm as the strict matcher — NOT fuzzy
 * matching. A wrong auto-suggestion is low-stakes (student just unchecks
 * it), but a wrong *fuzzy* match risks quietly pairing a receipt line with
 * the wrong document type, which is a worse failure mode than leaving it
 * unresolved. Genuine label drift (e.g. "Info. Copy of Grades" vs
 * "Informative Copy of Grades") is deliberately NOT guessed at here — see
 * unresolved[] below and UnmatchedCashierItem, which turns that into an
 * operational, admin-driven fix instead of an algorithmic guess.
 */
class CashierDocumentSuggester
{
    /**
     * access_id values visible to EITHER self-service form. Sourced from
     * App\Enums\AccessType::selfServiceVisibleIds() — the single backend
     * source of truth for this mapping — rather than a hand-typed literal.
     * See that enum's docblock for why: this suggester previously
     * hard-coded only the *student* form's subset ([1,3]), which meant
     * every alumni-exclusive (access_id=2) type could never be suggested
     * or resolved, no matter how many times an admin attached a pattern
     * to it.
     */
    private static function visibleAccessIds(): array
    {
        return AccessType::selfServiceVisibleIds();
    }

    /**
     * Build suggestions from a cashier receipt's line items.
     *
     * @param  array $cashierItems  items[] from CashierService::verifyPayment(),
     *                               each: { document: string, amount: string, quantity: int }
     * @return array{
     *     documents: array<int, array{document_type_id:int, document_name:string, number_of_copies:int}>,
     *     certificates: array<int, array{certificate_type_id:int, certificate_name:string, number_of_copies:int}>,
     *     unresolved: array<int, array{label:string, amount:mixed, quantity:int}>,
     * }
     */
    public function suggest(array $cashierItems): array
    {
        $index = $this->buildPatternIndex();

        $matchedDocuments    = [];
        $matchedCertificates = [];
        $unresolved          = [];

        foreach ($cashierItems as $item) {
            $rawLabel = trim((string) ($item['document'] ?? ''));
            $qty      = max(1, (int) ($item['quantity'] ?? 1));

            if ($rawLabel === '') {
                continue; // defensive — a blank receipt line has nothing to suggest
            }

            $key   = $this->normalise($rawLabel);
            $match = $index[$key] ?? null;

            if ($match === null) {
                $unresolved[] = [
                    'label'    => $rawLabel,
                    'amount'   => $item['amount'] ?? null,
                    'quantity' => $qty,
                ];

                $this->recordUnmatched($rawLabel);
                continue;
            }

            if ($match['type'] === 'document') {
                $id = $match['id'];
                $matchedDocuments[$id] ??= [
                    'document_type_id' => $id,
                    'document_name'    => $match['name'],
                    'number_of_copies' => 0,
                ];
                // Same label appearing on multiple receipt lines (e.g. two
                // separate fee lines for the same document) — sum copies,
                // same convention as CashierDocumentMatcher::buildReceiptIndex().
                $matchedDocuments[$id]['number_of_copies'] += $qty;
            } else {
                $id = $match['id'];
                $matchedCertificates[$id] ??= [
                    'certificate_type_id' => $id,
                    'certificate_name'    => $match['name'],
                    'number_of_copies'    => 0,
                ];
                $matchedCertificates[$id]['number_of_copies'] += $qty;
            }
        }

        // Cap suggested copies at 10 to match StoreDocumentRequestRequest's
        // own per-item rule (number_of_copies max:10) — a receipt with an
        // unusually high quantity on one line shouldn't hand the student a
        // pre-filled value final submit would reject outright.
        foreach ($matchedDocuments as &$doc) {
            $doc['number_of_copies'] = min(10, $doc['number_of_copies']);
        }
        unset($doc);
        foreach ($matchedCertificates as &$cert) {
            $cert['number_of_copies'] = min(10, $cert['number_of_copies']);
        }
        unset($cert);

        return [
            'documents'    => array_values($matchedDocuments),
            'certificates' => array_values($matchedCertificates),
            'unresolved'   => $unresolved,
        ];
    }

    // -------------------------------------------------------------------------
    // Private helpers
    // -------------------------------------------------------------------------

    /**
     * Build normalised-pattern → type index across every active,
     * student/alumni-visible document and certificate type.
     *
     * @return array<string, array{type:'document'|'certificate', id:int, name:string}>
     */
    private function buildPatternIndex(): array
    {
        $index = [];

        $documentTypes = DocumentType::where('is_archived', false)
            ->whereIn('access_id', self::visibleAccessIds())
            ->get(['document_type_id', 'document_name', 'cashier_document_patterns']);

        foreach ($documentTypes as $type) {
            foreach ($this->decodePatterns($type->cashier_document_patterns) as $pattern) {
                $this->indexPattern($index, $pattern, 'document', $type->document_type_id, $type->document_name);
            }
        }

        $certificateTypes = CertificationType::where('is_archived', false)
            ->whereIn('access_id', self::visibleAccessIds())
            ->get(['certificate_type_id', 'certificate_name', 'cashier_document_patterns']);

        foreach ($certificateTypes as $type) {
            foreach ($this->decodePatterns($type->cashier_document_patterns) as $pattern) {
                $this->indexPattern($index, $pattern, 'certificate', $type->certificate_type_id, $type->certificate_name);
            }
        }

        return $index;
    }

    /**
     * Add one pattern to the index. If two different types register the
     * same normalised pattern, that's an admin data-entry conflict (not
     * something the suggester can safely resolve) — keep the first
     * registration and log it once so it surfaces for cleanup, rather
     * than silently overwriting or crashing the request.
     */
    private function indexPattern(array &$index, string $pattern, string $type, int $id, string $name): void
    {
        $key = $this->normalise($pattern);

        if ($key === '') {
            return;
        }

        if (isset($index[$key]) && $index[$key]['id'] !== $id) {
            Log::warning('CashierDocumentSuggester: duplicate cashier pattern across types', [
                'pattern'        => $pattern,
                'existing_type'  => $index[$key]['type'],
                'existing_id'    => $index[$key]['id'],
                'conflicting_type' => $type,
                'conflicting_id'   => $id,
            ]);
            return; // first registration wins
        }

        $index[$key] = ['type' => $type, 'id' => $id, 'name' => $name];
    }

    /**
     * Normalise a label for matching: lowercase, trim, collapse internal
     * whitespace, strip trailing punctuation. Slightly more forgiving than
     * CashierDocumentMatcher's normalisation (lowercase+trim only) — safe
     * here because a false-positive suggestion costs the student one
     * unchecked box, not a wrongly-approved request. The strict matcher's
     * own normalisation is intentionally left as-is; see that class.
     */
    private function normalise(string $label): string
    {
        $label = mb_strtolower(trim($label));
        $label = preg_replace('/\s+/', ' ', $label) ?? $label;
        $label = rtrim($label, " .,;:-");

        return trim($label);
    }

    /**
     * Decode cashier_document_patterns the same way CashierDocumentMatcher
     * does — see that class's decodePatterns() for the full rationale.
     *
     * @return string[]
     */
    private function decodePatterns(mixed $raw): array
    {
        if ($raw === null) {
            return [];
        }

        if (is_array($raw)) {
            return $raw;
        }

        $decoded = json_decode((string) $raw, true);

        return is_array($decoded) ? $decoded : [];
    }

    /**
     * Record a receipt label that matched nothing, so registrar staff can
     * close the gap without a code deploy (Phase 2 — see
     * UnmatchedCashierItem). Best-effort: a logging failure here must
     * never break OR verification for the student, so any exception is
     * caught and logged rather than propagated.
     */
    private function recordUnmatched(string $rawLabel): void
    {
        try {
            \App\Models\UnmatchedCashierItem::recordSighting($rawLabel);
        } catch (\Throwable $e) {
            Log::error('CashierDocumentSuggester: failed to record unmatched item', [
                'label' => $rawLabel,
                'error' => $e->getMessage(),
            ]);
        }
    }
}