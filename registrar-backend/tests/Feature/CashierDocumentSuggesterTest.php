<?php

use App\Models\CertificationType;
use App\Models\DocumentType;
use App\Models\UnmatchedCashierItem;
use App\Services\CashierDocumentSuggester;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

function makeSuggestibleDocType(string $name, array $patterns, int $accessId = 1): DocumentType
{
    return DocumentType::create([
        'document_name'            => $name,
        'document_description'     => '',
        'document_process_period'  => 5,
        'access_id'                => $accessId,
        'cashier_document_patterns'=> $patterns,
    ]);
}

function makeSuggestibleCertType(string $name, array $patterns, int $accessId = 1): CertificationType
{
    return CertificationType::create([
        'certificate_name'           => $name,
        'certificate_requirements'   => '',
        'certificate_process_period' => '3 days',
        'access_id'                  => $accessId,
        'cashier_document_patterns'  => $patterns,
    ]);
}

// ═════════════════════════════════════════════════════════════════════════════
// Basic matching
// ═════════════════════════════════════════════════════════════════════════════

test('suggests a document type whose pattern exactly matches a receipt line', function () {
    $docType = makeSuggestibleDocType('Test Fixture Transcript', ['Test Fixture Transcript']);

    $suggester = new CashierDocumentSuggester();
    $result = $suggester->suggest([
        ['document' => 'Test Fixture Transcript', 'amount' => '150.00', 'quantity' => 2],
    ]);

    expect($result['documents'])->toHaveCount(1)
        ->and($result['documents'][0]['document_type_id'])->toBe($docType->document_type_id)
        ->and($result['documents'][0]['number_of_copies'])->toBe(2)
        ->and($result['certificates'])->toBeEmpty()
        ->and($result['unresolved'])->toBeEmpty();
});

test('suggests a certificate type whose pattern exactly matches a receipt line', function () {
    $certType = makeSuggestibleCertType('Good Moral Certificate', ['Good Moral Certificate']);

    $suggester = new CashierDocumentSuggester();
    $result = $suggester->suggest([
        ['document' => 'Good Moral Certificate', 'amount' => '50.00', 'quantity' => 1],
    ]);

    expect($result['certificates'])->toHaveCount(1)
        ->and($result['certificates'][0]['certificate_type_id'])->toBe($certType->certificate_type_id)
        ->and($result['documents'])->toBeEmpty();
});

test('matching is case-insensitive and tolerant of extra whitespace/punctuation', function () {
    $docType = makeSuggestibleDocType('Test Fixture Grade Copy', ['Test Fixture Grade Copy']);

    $suggester = new CashierDocumentSuggester();
    $result = $suggester->suggest([
        ['document' => '  test   fixture  grade copy.', 'amount' => '150.00', 'quantity' => 1],
    ]);

    expect($result['documents'])->toHaveCount(1)
        ->and($result['documents'][0]['document_type_id'])->toBe($docType->document_type_id);
});

test('a receipt line matching no pattern is unresolved, not silently dropped', function () {
    makeSuggestibleDocType('Test Fixture Transcript', ['Test Fixture Transcript']);

    $suggester = new CashierDocumentSuggester();
    $result = $suggester->suggest([
        ['document' => 'Info. Copy of Grades', 'amount' => '150.00', 'quantity' => 1],
    ]);

    expect($result['documents'])->toBeEmpty()
        ->and($result['unresolved'])->toHaveCount(1)
        ->and($result['unresolved'][0]['label'])->toBe('Info. Copy of Grades')
        ->and($result['unresolved'][0]['quantity'])->toBe(1);
});

test('sums quantities when the same document label appears on multiple receipt lines', function () {
    $docType = makeSuggestibleDocType('Test Fixture Transcript', ['Test Fixture Transcript']);

    $suggester = new CashierDocumentSuggester();
    $result = $suggester->suggest([
        ['document' => 'Test Fixture Transcript', 'quantity' => 1],
        ['document' => 'Test Fixture Transcript', 'quantity' => 2],
    ]);

    expect($result['documents'])->toHaveCount(1)
        ->and($result['documents'][0]['document_type_id'])->toBe($docType->document_type_id)
        ->and($result['documents'][0]['number_of_copies'])->toBe(3);
});

test('suggested copies are capped at 10 to match StoreDocumentRequestRequest\'s own limit', function () {
    $docType = makeSuggestibleDocType('Test Fixture Transcript', ['Test Fixture Transcript']);

    $suggester = new CashierDocumentSuggester();
    $result = $suggester->suggest([
        ['document' => 'Test Fixture Transcript', 'quantity' => 25],
    ]);

    expect($result['documents'][0]['number_of_copies'])->toBe(10);
});

// ═════════════════════════════════════════════════════════════════════════════
// Scope — only student/alumni-visible, non-archived types are suggested
// ═════════════════════════════════════════════════════════════════════════════

test('does not suggest an archived document type even if its pattern matches', function () {
    $docType = makeSuggestibleDocType('Test Fixture Transcript', ['Test Fixture Transcript']);
    $docType->update(['is_archived' => true]);

    $suggester = new CashierDocumentSuggester();
    $result = $suggester->suggest([
        ['document' => 'Test Fixture Transcript', 'quantity' => 1],
    ]);

    expect($result['documents'])->toBeEmpty()
        ->and($result['unresolved'])->toHaveCount(1);
});

test('does not suggest a document type outside student/alumni self-service access', function () {
    // access_id 2 = staff-only in this app's convention (not in
    // CashierDocumentSuggester::STUDENT_ACCESS_IDS = [1, 3]).
    makeSuggestibleDocType('Internal Staff Memo', ['Internal Staff Memo'], accessId: 2);

    $suggester = new CashierDocumentSuggester();
    $result = $suggester->suggest([
        ['document' => 'Internal Staff Memo', 'quantity' => 1],
    ]);

    expect($result['documents'])->toBeEmpty();
});

test('a type with null cashier_document_patterns is never suggested', function () {
    makeSuggestibleDocType('Certified True Copy', []);
    DocumentType::create([
        'document_name'            => 'No Pattern Doc',
        'document_description'     => '',
        'document_process_period'  => 5,
        'access_id'                => 1,
        'cashier_document_patterns'=> null,
    ]);

    $suggester = new CashierDocumentSuggester();
    $result = $suggester->suggest([
        ['document' => 'No Pattern Doc', 'quantity' => 1],
    ]);

    expect($result['documents'])->toBeEmpty()
        ->and($result['unresolved'])->toHaveCount(1);
});

// ═════════════════════════════════════════════════════════════════════════════
// Edge cases
// ═════════════════════════════════════════════════════════════════════════════

test('an empty receipt items array returns all-empty suggestions', function () {
    $suggester = new CashierDocumentSuggester();
    $result = $suggester->suggest([]);

    expect($result['documents'])->toBeEmpty()
        ->and($result['certificates'])->toBeEmpty()
        ->and($result['unresolved'])->toBeEmpty();
});

test('a blank document label on a receipt line is skipped, not treated as unresolved', function () {
    $suggester = new CashierDocumentSuggester();
    $result = $suggester->suggest([
        ['document' => '   ', 'quantity' => 1],
    ]);

    expect($result['unresolved'])->toBeEmpty();
});

test('two receipt lines can independently resolve to a document and a certificate', function () {
    $docType  = makeSuggestibleDocType('Test Fixture Transcript', ['Test Fixture Transcript']);
    $certType = makeSuggestibleCertType('Good Moral Certificate', ['Good Moral Certificate']);

    $suggester = new CashierDocumentSuggester();
    $result = $suggester->suggest([
        ['document' => 'Test Fixture Transcript', 'quantity' => 1],
        ['document' => 'Good Moral Certificate', 'quantity' => 1],
    ]);

    expect($result['documents'])->toHaveCount(1)
        ->and($result['certificates'])->toHaveCount(1)
        ->and($result['documents'][0]['document_type_id'])->toBe($docType->document_type_id)
        ->and($result['certificates'][0]['certificate_type_id'])->toBe($certType->certificate_type_id);
});

// ═════════════════════════════════════════════════════════════════════════════
// UnmatchedCashierItem logging — the suggester's "operational fix" hook
// ═════════════════════════════════════════════════════════════════════════════

test('an unresolved receipt label is recorded to unmatched_cashier_items', function () {
    $suggester = new CashierDocumentSuggester();
    $suggester->suggest([
        ['document' => 'Info. Copy of Grades', 'quantity' => 1],
    ]);

    $row = UnmatchedCashierItem::first();

    expect($row)->not->toBeNull()
        ->and($row->raw_label)->toBe('Info. Copy of Grades')
        ->and($row->normalised_label)->toBe('info. copy of grades')
        ->and($row->occurrence_count)->toBe(1);
});

test('repeated sightings of the same unresolved label bump occurrence_count instead of duplicating rows', function () {
    $suggester = new CashierDocumentSuggester();

    $suggester->suggest([['document' => 'Info. Copy of Grades', 'quantity' => 1]]);
    $suggester->suggest([['document' => 'INFO. COPY OF GRADES', 'quantity' => 1]]); // same after normalisation
    $suggester->suggest([['document' => '  Info. Copy of Grades  ', 'quantity' => 1]]);

    expect(UnmatchedCashierItem::count())->toBe(1)
        ->and(UnmatchedCashierItem::first()->occurrence_count)->toBe(3);
});

test('a resolved label appearing again is left resolved rather than reopened silently', function () {
    UnmatchedCashierItem::create([
        'raw_label'        => 'Info. Copy of Grades',
        'normalised_label' => UnmatchedCashierItem::normaliseLabel('Info. Copy of Grades'),
        'occurrence_count' => 5,
        'first_seen_at'    => now()->subDays(3),
        'last_seen_at'     => now()->subDay(),
        'resolved_at'      => now()->subHours(2),
    ]);

    $suggester = new CashierDocumentSuggester();
    $suggester->suggest([['document' => 'Info. Copy of Grades', 'quantity' => 1]]);

    $row = UnmatchedCashierItem::first();

    expect($row->resolved_at)->not->toBeNull()
        ->and($row->occurrence_count)->toBe(6); // still counted, just not reopened
});