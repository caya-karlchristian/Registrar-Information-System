<?php

use App\Models\RequestHistory;

// ═════════════════════════════════════════════════════════════════════════════
// RequestHistory::changed_at — must serialize as timezone-aware ISO-8601
//
// QA fix: "Local Time vs UTC in Logbook" — processed/claimed timestamps
// pulled from request_history.changed_at were showing 8 hours off in
// Asia/Manila. Root cause: the column is a naive UTC DATETIME with no
// 'datetime' cast on the model, so Eloquent serialized it as a bare
// "Y-m-d H:i:s" string. The frontend's `new Date(value)` (see
// logbookHelpers.js) parses that space-separated format as LOCAL time
// instead of UTC, shifting every processed/claimed timestamp by the
// viewer's UTC offset. Casting to 'datetime' makes it serialize with a
// timezone marker (e.g. trailing "Z"), same as DocumentRequest::requested_at
// already does — this test locks that in.
//
// Uses an in-memory model instance (no DB round trip) so it doesn't need
// RequestHistory's FK dependencies (DocumentRequest, RequestStatus) set up.
// ═════════════════════════════════════════════════════════════════════════════

test('changed_at is cast to a Carbon datetime, not a raw string', function () {
    $history = new RequestHistory(['changed_at' => '2026-08-15 06:30:00']);

    expect($history->changed_at)->toBeInstanceOf(\Illuminate\Support\Carbon::class);
});

test('changed_at serializes to JSON with a timezone marker, not a naive datetime string', function () {
    $history = new RequestHistory(['changed_at' => '2026-08-15 06:30:00']);

    $json = $history->toArray();

    // A naive "Y-m-d H:i:s" string (the pre-fix shape) has no offset and
    // no "T" separator — this is what let the frontend misread it as
    // local time. The cast must produce an ISO-8601 value instead.
    expect($json['changed_at'])->toMatch('/T.*(Z|[+-]\d{2}:\d{2})$/');
});
