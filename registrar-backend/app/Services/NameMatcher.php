<?php

namespace App\Services;

/**
 * NameMatcher
 *
 * IMPORTANT — this class's role changed shape during design once a real
 * API constraint was discovered; read this before touching it.
 *
 * The original design was "compare RIS's submitted name against the
 * Cashier's on-file name after a failed lookup, and rescue near-misses."
 * That's not buildable: per the Cashier System API doc, a NOT_FOUND
 * response is exactly `{"valid": false, "reason": "NOT_FOUND"}` — no
 * `data`, no on-file name — and a wrong name vs. a wrong OR number
 * return that identical shape. RIS never receives the name that's
 * actually on file when a lookup fails, so there is nothing to
 * fuzzy-compare against after the fact.
 *
 * What's actually buildable instead: generate several plausible
 * formattings of the same person's name from data RIS already has (the
 * student/alumni profile), and let the caller retry verifyPayment() with
 * each candidate until one succeeds or all are exhausted. This works
 * because the Cashier API is a live, repeatable endpoint we can call
 * more than once — the compensating control is "try harder," not
 * "second-guess the API's answer."
 *
 * Why this is needed at all
 * -------------------------
 * The Cashier System's "Customer Name" field is free text (confirmed via
 * screenshot of the live payment form, 2026-08-11) — the placeholder
 * "LAST NAME, FIRST NAME M.I." is a hint, not an enforced format.
 * Nothing stops a cashier admin from typing a full middle name, dropping
 * it entirely, or reordering it. RIS's own formatCustomerName() produces
 * one specific format (middle initial, no full middle name — fixed
 * 2026-08-11 for the same reason). If the admin's on-file string uses a
 * different convention than the one RIS guesses, the OR is real and paid
 * but verification still fails.
 *
 * Design
 * ------
 * Candidates are ordered from most- to least-likely, and the caller
 * should stop at the first one that returns valid:true (see
 * DocumentRequestController::store()). The OR number itself is never
 * varied — it's the real credential (single-use enforced, not
 * practically guessable). Only the name formatting is guessed, because
 * that's the only piece a free-text form makes unreliable.
 *
 * This class does not call the API, log anything, or decide pass/fail —
 * it only generates candidate strings. The caller owns the retry loop
 * and the audit trail.
 */
class NameMatcher
{
    /**
     * Generate plausible name-string candidates for the same person,
     * most-likely-correct first.
     *
     * Beyond the middle-name variants (initial / full / omitted), this
     * also varies punctuation and word order. Confirmed 2026-08-11: the
     * Cashier System's "Customer Name" field is free text an admin types
     * by hand, and the "LAST NAME, FIRST NAME M.I." placeholder on its own
     * form is not enforced — one real OR was on file simply as
     * "Floresca Duvan" (no comma at all, not even following its own
     * form's convention). Since the admin's format can't be predicted and
     * the cashier team can't change how they enter names, RIS compensates
     * by trying multiple plausible formats rather than one "correct" one.
     *
     * Also confirmed 2026-08-12: the missing-comma problem has a sibling —
     * cashier admins are just as inconsistent about the *period* on a
     * middle initial or suffix as they are about the comma. "JUAN S. DELA
     * CRUZ" and "JUAN S DELA CRUZ" are the same person to a human, but the
     * Cashier API does exact string matching, so a dropped period is a
     * hard miss same as a dropped comma. This adds period-optional
     * variants for the middle initial and the suffix, applied to the
     * highest-priority (comma) format rather than cross-multiplied across
     * every existing candidate — a full cross product (period x comma x
     * order x suffix) would push the list into the dozens for the small
     * fraction of people who have both a middle name and a suffix, and
     * every extra candidate is one more live API call before a genuinely
     * bad OR gets rejected.
     *
     * @return string[]  Deduplicated, in priority order. Always includes
     *                    at least the primary formatCustomerName() output.
     */
    public function candidatesFor(
        string $lastName,
        string $firstName,
        string $middleName = '',
        string $suffix     = '',
    ): array {
        $last   = strtoupper(trim($lastName));
        $first  = strtoupper(trim($firstName));
        $middle = trim($middleName);

        $suffixBase   = trim($suffix) !== '' ? rtrim(strtoupper(trim($suffix)), '.') : '';
        $suffixDotted = $suffixBase !== '' ? $suffixBase . '.' : '';
        $suffixBare   = $suffixBase; // e.g. "JR" — admin dropped the period

        $middleLetter        = $middle !== '' ? strtoupper(mb_substr($middle, 0, 1)) : '';
        $middleInitialDotted = $middleLetter !== '' ? $middleLetter . '.' : '';
        $middleInitialBare   = $middleLetter; // e.g. "S" — admin dropped the period
        $middleFull          = $middle !== '' ? strtoupper($middle) : '';

        $candidates = [
            // 1. Current standard: "LAST, FIRST M.I." — matches the API
            //    doc's own sample names (e.g. "MENDOZA, JAMES MARTIN").
            $this->buildComma($last, $first, $middleInitialDotted, $suffixDotted),
            // 2. Same, but middle initial has no trailing period — covers
            //    an admin who typed "S" instead of "S." (2026-08-12).
            $middleInitialBare !== '' ? $this->buildComma($last, $first, $middleInitialBare, $suffixDotted) : null,
            // 3. Full middle name, in case the admin typed it as-is.
            $middleFull !== '' ? $this->buildComma($last, $first, $middleFull, $suffixDotted) : null,
            // 4. No middle name at all, in case the admin omitted it.
            $this->buildComma($last, $first, '', $suffixDotted),
            // 5. Same as #1, but suffix has no trailing period — covers
            //    an admin who typed "JR" instead of "JR." (2026-08-12).
            $suffixBare !== '' ? $this->buildComma($last, $first, $middleInitialDotted, $suffixBare) : null,
            // 6. Same "last name first" order, but no comma — covers an
            //    admin who typed the name straight into the box without
            //    following the placeholder's convention at all.
            $middleInitialDotted !== '' ? $this->buildSpace([$last, $first, $middleInitialDotted, $suffixDotted]) : null,
            $this->buildSpace([$last, $first, $suffixDotted]),
            // 7. Natural spoken order ("First Last"), no comma — covers an
            //    admin who typed the name the way they'd say it out loud
            //    rather than in registrar order.
            $middleInitialDotted !== '' ? $this->buildSpace([$first, $middleInitialDotted, $last, $suffixDotted]) : null,
            $this->buildSpace([$first, $last, $suffixDotted]),
        ];

        return array_values(array_unique(array_filter(
            $candidates,
            fn ($c) => $c !== null && $c !== ''
        )));
    }

    private function buildComma(string $last, string $first, string $middle, string $suffix): string
    {
        $given = implode(' ', array_filter([$first, $middle, $suffix]));

        return "{$last}, {$given}";
    }

    /**
     * Join non-empty parts with a single space, no comma. Used for the
     * no-punctuation candidate variants.
     */
    private function buildSpace(array $parts): string
    {
        return implode(' ', array_filter($parts, fn ($p) => $p !== ''));
    }

    // -------------------------------------------------------------------
    // Retained below: lenient name similarity, for cases where we DO have
    // both strings to compare (e.g. a future admin-facing manual lookup
    // tool, or a Cashier API version that returns the on-file name on
    // failure). Not reachable from the retry flow above today, since
    // NOT_FOUND gives us nothing to compare against.
    // -------------------------------------------------------------------

    /**
     * Minimum Jaro-Winkler similarity for last/first name tokens to count
     * as a match. 0.90 tolerates a stray typo or punctuation difference
     * without accepting a genuinely different name.
     */
    private const STRICT_THRESHOLD = 0.90;

    /**
     * Compare two names and classify the result.
     *
     * @param  string $submitted  Name RIS generated, e.g. "DELA CRUZ, JUAN S."
     * @param  string $onFile     Name returned by the Cashier API's data.customer_name
     * @return array{
     *     match_type: 'exact'|'fuzzy'|'fail',
     *     score: float,
     *     is_match: bool,
     * }
     */
    public function compare(string $submitted, string $onFile): array
    {
        $a = $this->normalise($submitted);
        $b = $this->normalise($onFile);

        if ($a === $b) {
            return ['match_type' => 'exact', 'score' => 1.0, 'is_match' => true];
        }

        [$aLast, $aFirst, $aMiddle] = $this->splitName($a);
        [$bLast, $bFirst, $bMiddle] = $this->splitName($b);

        $lastScore  = $this->similarity($aLast, $bLast);
        $firstScore = $this->similarity($aFirst, $bFirst);
        $middleOk   = $this->middleMatches($aMiddle, $bMiddle);

        $isMatch = $lastScore >= self::STRICT_THRESHOLD
            && $firstScore >= self::STRICT_THRESHOLD
            && $middleOk;

        // Overall score for logging/tuning: weight last+first, middle is
        // pass/fail so it contributes 1.0 or 0.0 rather than a partial score.
        $score = round(
            ($lastScore * 0.45) + ($firstScore * 0.45) + ($middleOk ? 0.10 : 0.0),
            4
        );

        return [
            'match_type' => $isMatch ? 'fuzzy' : 'fail',
            'score'      => $score,
            'is_match'   => $isMatch,
        ];
    }

    // -------------------------------------------------------------------------
    // Private helpers
    // -------------------------------------------------------------------------

    /**
     * Normalise a name for comparison: uppercase, strip periods, collapse
     * whitespace. Does NOT reorder or split — that happens in splitName().
     */
    private function normalise(string $name): string
    {
        $name = strtoupper(trim($name));
        $name = str_replace('.', '', $name);
        $name = preg_replace('/\s+/', ' ', $name);

        return trim($name);
    }

    /**
     * Split a normalised "LASTNAME, FIRSTNAME [MIDDLE] [SUFFIX]" string
     * into [last, first, middle]. Suffix (JR, SR, III, etc.) is folded
     * into $middle's trailing token and ignored by middleMatches(), since
     * suffix presence/absence isn't the concern here — middle name
     * ambiguity is.
     *
     * Falls back gracefully if there's no comma (treats the whole string
     * as the "last name" slot so it still gets *some* comparison rather
     * than throwing).
     */
    private function splitName(string $normalised): array
    {
        if (!str_contains($normalised, ',')) {
            return [$normalised, '', ''];
        }

        [$last, $rest] = array_map('trim', explode(',', $normalised, 2));

        $tokens = $rest === '' ? [] : explode(' ', $rest);
        $first  = $tokens[0] ?? '';
        $middle = implode(' ', array_slice($tokens, 1));

        return [$last, $first, $middle];
    }

    /**
     * Middle name comparison is lenient by design (see class docblock):
     *   - Both empty → match (neither side gave a middle name).
     *   - Either side empty, other non-empty → match (cashier admin may
     *     omit it entirely; that's not evidence of a different person).
     *   - Both non-empty → match if one is a prefix of the other after
     *     stripping suffix words, covering "CAMERO" vs "C" vs "CAMERO JR".
     */
    private function middleMatches(string $a, string $b): bool
    {
        $a = $this->stripSuffixWords($a);
        $b = $this->stripSuffixWords($b);

        if ($a === '' || $b === '') {
            return true;
        }

        $aFirstToken = explode(' ', $a)[0];
        $bFirstToken = explode(' ', $b)[0];

        return str_starts_with($aFirstToken, $bFirstToken)
            || str_starts_with($bFirstToken, $aFirstToken);
    }

    private function stripSuffixWords(string $value): string
    {
        $suffixes = ['JR', 'SR', 'II', 'III', 'IV', 'V'];
        $tokens   = array_filter(
            explode(' ', $value),
            fn (string $t) => !in_array($t, $suffixes, true)
        );

        return implode(' ', $tokens);
    }

    /**
     * Jaro-Winkler similarity, 0.0–1.0. Pure PHP, no extension/package
     * dependency — appropriate for short name tokens where a small,
     * well-tested implementation is preferable to a new composer
     * requirement.
     */
    private function similarity(string $a, string $b): float
    {
        if ($a === '' && $b === '') {
            return 1.0;
        }
        if ($a === '' || $b === '') {
            return 0.0;
        }
        if ($a === $b) {
            return 1.0;
        }

        $jaro = $this->jaro($a, $b);

        // Winkler boost: reward strings that share a common prefix
        // (up to 4 chars), which is common with names (typos usually
        // land mid-word, not at the start).
        $prefixLength = 0;
        $maxPrefix    = min(4, min(mb_strlen($a), mb_strlen($b)));
        for ($i = 0; $i < $maxPrefix; $i++) {
            if (mb_substr($a, $i, 1) === mb_substr($b, $i, 1)) {
                $prefixLength++;
            } else {
                break;
            }
        }

        return $jaro + ($prefixLength * 0.1 * (1 - $jaro));
    }

    private function jaro(string $a, string $b): float
    {
        $aLen = mb_strlen($a);
        $bLen = mb_strlen($b);

        if ($aLen === 0 || $bLen === 0) {
            return 0.0;
        }

        $matchDistance = intdiv(max($aLen, $bLen), 2) - 1;
        $matchDistance = max($matchDistance, 0);

        $aMatches = array_fill(0, $aLen, false);
        $bMatches = array_fill(0, $bLen, false);

        $matches = 0;
        for ($i = 0; $i < $aLen; $i++) {
            $start = max(0, $i - $matchDistance);
            $end   = min($i + $matchDistance + 1, $bLen);

            for ($j = $start; $j < $end; $j++) {
                if ($bMatches[$j] || mb_substr($a, $i, 1) !== mb_substr($b, $j, 1)) {
                    continue;
                }
                $aMatches[$i] = true;
                $bMatches[$j] = true;
                $matches++;
                break;
            }
        }

        if ($matches === 0) {
            return 0.0;
        }

        $transpositions = 0;
        $k = 0;
        for ($i = 0; $i < $aLen; $i++) {
            if (!$aMatches[$i]) {
                continue;
            }
            while (!$bMatches[$k]) {
                $k++;
            }
            if (mb_substr($a, $i, 1) !== mb_substr($b, $k, 1)) {
                $transpositions++;
            }
            $k++;
        }
        $transpositions = intdiv($transpositions, 2);

        return (
            ($matches / $aLen)
            + ($matches / $bLen)
            + (($matches - $transpositions) / $matches)
        ) / 3;
    }
}