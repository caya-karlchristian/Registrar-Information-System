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

test('suffix is appended consistently across every candidate', function () {
    $matcher = new NameMatcher();

    $candidates = $matcher->candidatesFor('Guevarra', 'Pedro', 'Alonzo', 'Jr');

    foreach ($candidates as $candidate) {
        expect($candidate)->toEndWith('JR.');
    }
});

test('candidatesFor never returns an empty list', function () {
    $matcher = new NameMatcher();

    $candidates = $matcher->candidatesFor('Santos', 'Jose', '', '');

    expect($candidates)->not->toBeEmpty();
});