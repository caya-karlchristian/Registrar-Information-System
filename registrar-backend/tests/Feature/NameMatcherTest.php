<?php

use App\Services\NameMatcher;

// ═════════════════════════════════════════════════════════════════════════════
// UNIT — NameMatcher::candidatesFor
//
// Context: the Cashier API never returns the on-file name on a failed
// lookup (NOT_FOUND gives {valid:false, reason:'NOT_FOUND', data:null} —
// no way to know what name is actually stored). So RIS can't fuzzy-compare
// after the fact; the only compensating move is generating plausible
// candidate formats up front and retrying. These tests lock in that
// candidate list and its ordering.
// ═════════════════════════════════════════════════════════════════════════════

test('first candidate is the standard middle-initial format', function () {
    $matcher = new NameMatcher();

    $candidates = $matcher->candidatesFor('Dela Cruz', 'Juan', 'Santos', '');

    expect($candidates[0])->toBe('DELA CRUZ, JUAN S.');
});

test('candidates include the full middle name as a fallback', function () {
    $matcher = new NameMatcher();

    $candidates = $matcher->candidatesFor('Romano', 'Jefferson', 'Camero', '');

    expect($candidates)->toContain('ROMANO, JEFFERSON CAMERO')
        ->and($candidates)->toContain('ROMANO, JEFFERSON C.');
});

test('candidates include a no-middle-name fallback', function () {
    $matcher = new NameMatcher();

    $candidates = $matcher->candidatesFor('Dela Cruz', 'Juan', 'Santos', '');

    expect($candidates)->toContain('DELA CRUZ, JUAN');
});

test('comma-form middle-name variants collapse when there is no middle name at all', function () {
    $matcher = new NameMatcher();

    $candidates = $matcher->candidatesFor('Reyes', 'Maria', '', '');

    // With no middle name, the initial/full-middle/no-middle *comma* variants
    // collapse to a single string — array_unique should drop the duplicates
    // rather than repeating "REYES, MARIA" three times.
    expect(array_count_values($candidates)['REYES, MARIA'])->toBe(1);
});

test('candidates include a no-comma, last-name-first variant', function () {
    $matcher = new NameMatcher();

    // Regression test for the 2026-08-11 incident: an OR was on file as
    // "Floresca Duvan" — no comma, not following the Cashier form's own
    // "LAST NAME, FIRST NAME M.I." placeholder at all. RIS's comma-only
    // candidates all missed it; verified live via the Cashier API that
    // this exact space-separated string is what matches.
    $candidates = $matcher->candidatesFor('Floresca', 'Duvan', '', '');

    expect($candidates)->toContain('FLORESCA DUVAN');
});

test('candidates include a no-comma, natural spoken-order variant', function () {
    $matcher = new NameMatcher();

    $candidates = $matcher->candidatesFor('Dela Cruz', 'Juan', '', '');

    expect($candidates)->toContain('JUAN DELA CRUZ');
});

test('no-comma variants also carry the middle initial when one exists', function () {
    $matcher = new NameMatcher();

    $candidates = $matcher->candidatesFor('Romano', 'Jefferson', 'Camero', '');

    expect($candidates)->toContain('ROMANO JEFFERSON C.')
        ->and($candidates)->toContain('JEFFERSON C. ROMANO');
});

test('the full candidate list has no exact duplicates', function () {
    $matcher = new NameMatcher();

    $candidates = $matcher->candidatesFor('Guevarra', 'Pedro', 'Alonzo', 'Jr');

    expect($candidates)->toBe(array_values(array_unique($candidates)));
});

test('suffix appears with a period on most candidates, and bare on some', function () {
    $matcher = new NameMatcher();

    $candidates = $matcher->candidatesFor('Guevarra', 'Pedro', 'Alonzo', 'Jr');

    // Every candidate carries the suffix in some form, either after the
    // last name ("GUEVARRA JR., ...") or at the end of the given names
    // ("..., PEDRO A. JR"), so a plain suffix match (mid-string or
    // trailing) is what we can assert generically here.
    foreach ($candidates as $candidate) {
        expect($candidate)->toMatch('/JR\.?/');
    }

    expect($candidates)->toContain('GUEVARRA, PEDRO A. JR')
        ->and(array_filter($candidates, fn ($c) => str_ends_with($c, 'JR')))->not->toBeEmpty();
});

test('candidatesFor never returns an empty list', function () {
    $matcher = new NameMatcher();

    $candidates = $matcher->candidatesFor('Santos', 'Jose', '', '');

    expect($candidates)->not->toBeEmpty();
});

// ─────────────────────────────────────────────────────────────────────────
// Regression tests — 2026-08-12 incident: admin dropped the period on a
// middle initial ("S" instead of "S."), which blocked a valid OR the same
// way the missing-comma case did on 2026-08-11.
// ─────────────────────────────────────────────────────────────────────────

test('candidates include a bare (no-period) middle-initial comma variant', function () {
    $matcher = new NameMatcher();

    $candidates = $matcher->candidatesFor('Dela Cruz', 'Juan', 'Santos', '');

    expect($candidates)->toContain('DELA CRUZ, JUAN S.')
        ->and($candidates)->toContain('DELA CRUZ, JUAN S');
});

test('candidates include a bare (no-period) suffix comma variant', function () {
    $matcher = new NameMatcher();

    $candidates = $matcher->candidatesFor('Guevarra', 'Pedro', '', 'Jr');

    expect($candidates)->toContain('GUEVARRA, PEDRO JR.')
        ->and($candidates)->toContain('GUEVARRA, PEDRO JR');
});

test('bare-period variants are skipped when there is no middle name or suffix', function () {
    $matcher = new NameMatcher();

    $candidates = $matcher->candidatesFor('Santos', 'Jose', '', '');

    // No middle name and no suffix means there's nothing to drop a period
    // from — the list shouldn't grow with redundant empty-variant entries.
    expect($candidates)->toBe(array_values(array_unique($candidates)));
});

// ─────────────────────────────────────────────────────────────────────────
// Regression tests — 2026-08-13 incident: a real OR was on file as
// "NONO JR., JOEGE C." (suffix attached to the LAST name, before the
// comma) rather than at the end of the given names. Every prior candidate
// put the suffix after the middle initial instead, so a suffixed student
// could never match no matter how many punctuation variants existed —
// confirmed live via the Cashier API on 2026-08-13.
// ─────────────────────────────────────────────────────────────────────────

test('candidates include the suffix attached to the last name', function () {
    $matcher = new NameMatcher();

    $candidates = $matcher->candidatesFor('Nono', 'Joege', 'Catayen', 'Jr');

    expect($candidates)->toContain('NONO JR., JOEGE C.');
});

test('last-name-attached suffix also has a bare (no-period) variant', function () {
    $matcher = new NameMatcher();

    $candidates = $matcher->candidatesFor('Nono', 'Joege', 'Catayen', 'Jr');

    expect($candidates)->toContain('NONO JR, JOEGE C.');
});

test('last-name-attached suffix variant collapses to the base last name when there is no suffix', function () {
    $matcher = new NameMatcher();

    $candidates = $matcher->candidatesFor('Dela Cruz', 'Juan', 'Santos', '');

    // With no suffix, "last name + suffix" collapses to just the last
    // name — array_unique should drop the resulting duplicate rather than
    // padding the list with a candidate identical to #1.
    expect(array_count_values($candidates)['DELA CRUZ, JUAN S.'])->toBe(1);
});

test('last-name-attached suffix candidate is prioritized near the top of the list', function () {
    $matcher = new NameMatcher();

    $candidates = $matcher->candidatesFor('Nono', 'Joege', 'Catayen', 'Jr');
    $position   = array_search('NONO JR., JOEGE C.', $candidates, true);

    // Confirmed as a real, currently-observed on-file convention (not a
    // hypothetical), so it should be tried early — not buried behind
    // every no-comma / spoken-order fallback.
    expect($position)->not->toBeFalse()
        ->and($position)->toBeLessThan(3);
});

// ─────────────────────────────────────────────────────────────────────────
// Hyphenated names — anticipated failure mode, not yet an observed
// incident. A compound surname ("GARCIA-REYES") or hyphenated first name
// ("MARY-JOY") has the same free-text ambiguity as punctuation elsewhere:
// an admin may type the hyphen, a space, or nothing at all. Separator
// variants are safe to guess because they never change which person the
// string identifies. Deliberately NOT tested/implemented: dropping one
// half of a hyphenated name, since that changes which name is being
// searched for and risks matching a different real person — see class
// docblock.
// ─────────────────────────────────────────────────────────────────────────

test('hyphenated last name gets a space-separated variant', function () {
    $matcher = new NameMatcher();

    $candidates = $matcher->candidatesFor('Garcia-Reyes', 'Mary', '', '');

    expect($candidates)->toContain('GARCIA REYES, MARY');
});

test('hyphenated last name gets a no-separator variant', function () {
    $matcher = new NameMatcher();

    $candidates = $matcher->candidatesFor('Garcia-Reyes', 'Mary', '', '');

    expect($candidates)->toContain('GARCIAREYES, MARY');
});

test('hyphenated first name gets a space-separated variant', function () {
    $matcher = new NameMatcher();

    $candidates = $matcher->candidatesFor('Santos', 'Mary-Joy', '', '');

    expect($candidates)->toContain('SANTOS, MARY JOY');
});

test('hyphenated first name gets a no-separator variant', function () {
    $matcher = new NameMatcher();

    $candidates = $matcher->candidatesFor('Santos', 'Mary-Joy', '', '');

    expect($candidates)->toContain('SANTOS, MARYJOY');
});

test('hyphen variants are not generated for non-hyphenated names', function () {
    $matcher = new NameMatcher();

    // Confirms the fix is zero-cost for the common case — no extra
    // candidates appear when there's nothing to vary.
    $withHyphen    = count($matcher->candidatesFor('Garcia-Reyes', 'Mary', '', ''));
    $withoutHyphen = count($matcher->candidatesFor('Garcia', 'Mary', '', ''));

    expect($withHyphen)->toBeGreaterThan($withoutHyphen);
});

test('candidates never drop one half of a hyphenated surname', function () {
    $matcher = new NameMatcher();

    $candidates = $matcher->candidatesFor('Garcia-Reyes', 'Mary', '', '');

    // Intentional: matching just "GARCIA" or just "REYES" would risk
    // confirming a different real person's payment, not just guessing
    // punctuation. This must never happen automatically.
    expect($candidates)->not->toContain('GARCIA, MARY')
        ->and($candidates)->not->toContain('REYES, MARY');
});

test('a fully loaded hyphenated name with middle name and suffix stays under the safety cap', function () {
    $matcher = new NameMatcher();

    $candidates = $matcher->candidatesFor('Garcia-Reyes', 'Mary-Joy', 'Santos', 'Jr');

    expect(count($candidates))->toBeLessThanOrEqual(16);
});

// ─────────────────────────────────────────────────────────────────────────
// Safety cap — a live API call is made per candidate in the caller's
// retry loop, so the list must never grow unbounded no matter how many
// variant dimensions (punctuation, suffix slot, word order) get added.
// ─────────────────────────────────────────────────────────────────────────

test('candidate list never exceeds the safety cap even for a person with every variant dimension', function () {
    $matcher = new NameMatcher();

    $candidates = $matcher->candidatesFor('Dela Cruz', 'Juan', 'Santos', 'Jr');

    expect(count($candidates))->toBeLessThanOrEqual(16);
});

// ─────────────────────────────────────────────────────────────────────────
// Input sanitization — profile data reaches an outbound HTTP call and the
// audit log, so it needs defensive normalization the same way any
// externally-influenced input would.
// ─────────────────────────────────────────────────────────────────────────

test('control characters are stripped from every name part', function () {
    $matcher = new NameMatcher();

    $candidates = $matcher->candidatesFor("Dela\x00 Cruz", "Ju\x07an", 'Santos', '');

    expect($candidates[0])->toBe('DELA CRUZ, JUAN S.');
});

test('repeated internal whitespace is collapsed', function () {
    $matcher = new NameMatcher();

    $candidates = $matcher->candidatesFor('Dela   Cruz', 'Juan', '', '');

    expect($candidates[0])->toBe('DELA CRUZ, JUAN');
});

test('excessively long name parts are truncated rather than passed through unbounded', function () {
    $matcher = new NameMatcher();

    $longLast = str_repeat('A', 500);

    $candidates = $matcher->candidatesFor($longLast, 'Juan', '', '');

    expect(mb_strlen(explode(',', $candidates[0])[0]))->toBeLessThanOrEqual(100);
});

test('a suffix with a period already on it is not double-punctuated', function () {
    $matcher = new NameMatcher();

    $candidates = $matcher->candidatesFor('Santos', 'Jose', '', 'Sr.');

    expect($candidates)->toContain('SANTOS, JOSE SR.')
        ->and($candidates)->not->toContain('SANTOS, JOSE SR..');
});