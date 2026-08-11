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

test('candidates are deduplicated when there is no middle name at all', function () {
    $matcher = new NameMatcher();

    $candidates = $matcher->candidatesFor('Reyes', 'Maria', '', '');

    // With no middle name, the initial/full-middle/no-middle variants
    // collapse to the same string — should appear once, not three times.
    expect($candidates)->toBe(['REYES, MARIA']);
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
