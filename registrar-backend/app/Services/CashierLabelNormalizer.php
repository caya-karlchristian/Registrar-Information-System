<?php

namespace App\Services;

/**
 * CashierLabelNormalizer
 *
 * Single source of truth for turning a raw cashier receipt label into the
 * normalised form used for matching and deduplication across the cashier
 * subsystem.
 *
 * Why this exists
 * ----------------
 * Before this class, the exact same normalisation logic — lowercase, trim,
 * collapse internal whitespace, strip trailing punctuation — was
 * independently duplicated in three places:
 *
 *   - CashierDocumentMatcher::normalise()      (strict, money-facing check)
 *   - CashierDocumentSuggester::normalise()    (lenient, pre-fill suggestion)
 *   - UnmatchedCashierItem::normaliseLabel()   (dedupe key for the queue)
 *
 * Each copy's docblock already said, in effect, "keep this identical to the
 * other one(s)" — which is exactly the kind of implicit contract that
 * silently breaks the moment only one copy gets touched. That is precisely
 * what happened with access_id filtering earlier in this subsystem's
 * history (see CashierDocumentSuggester's own docblock): a single-file
 * change created a gap that took real students hitting real rejections to
 * surface. Normalisation drifting the same way would be quieter but just
 * as harmful — a receipt line the suggester pre-checks could silently stop
 * matching the strict matcher at final submit, or the unmatched-items
 * queue could stop deduplicating correctly — purely because someone
 * updated one copy's punctuation-stripping rule and not the other two.
 *
 * Centralising the algorithm here means there is exactly one place left to
 * change, and every consumer picks it up automatically.
 *
 * Scope note
 * ----------
 * This is intentionally still exact-match-after-normalisation, not fuzzy
 * matching — see CashierDocumentSuggester's class docblock for why fuzzy
 * matching is deliberately out of scope for this subsystem. This class only
 * forgives formatting noise (case, whitespace, trailing punctuation), never
 * a genuinely different label.
 */
final class CashierLabelNormalizer
{
    /**
     * Normalise a cashier label for matching/deduplication.
     *
     * - Lowercases (multibyte-safe — see mb_strtolower, not strtolower).
     * - Trims leading/trailing whitespace.
     * - Collapses runs of internal whitespace to a single space.
     * - Strips trailing punctuation the cashier system's free-text entry
     *   commonly appends (periods, commas, semicolons, colons, hyphens).
     *
     * @param  string $label  Raw label, e.g. from a cashier receipt line
     *                        or an admin-maintained pattern list.
     */
    public static function normalize(string $label): string
    {
        $label = mb_strtolower(trim($label));
        $label = preg_replace('/\s+/', ' ', $label) ?? $label;
        $label = rtrim($label, " .,;:-");

        return trim($label);
    }
}
