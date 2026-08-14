<?php

use App\Models\BusinessCalendar;
use App\Services\BusinessCalendarService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;

uses(RefreshDatabase::class);

beforeEach(function () {
    config(['app.display_timezone' => 'Asia/Manila']);
});

test('reports open with a same-day closing time during office hours', function () {
    $service = new BusinessCalendarService();

    // Tuesday 10:00 AM Manila time — well inside 8am-8pm.
    $at = Carbon::parse('2026-03-10 10:00:00', 'Asia/Manila');

    $status = $service->currentStatus($at);

    expect($status['is_open'])->toBeTrue()
        ->and($status['next_open_at'])->toBeNull()
        ->and($status['closes_at']->toDateTimeString())->toBe('2026-03-10 20:00:00');
});

test('reports closed with next_open_at later the same day, before opening', function () {
    $service = new BusinessCalendarService();

    // Tuesday 6:00 AM — before the 8am opening, same day.
    $at = Carbon::parse('2026-03-10 06:00:00', 'Asia/Manila');

    $status = $service->currentStatus($at);

    expect($status['is_open'])->toBeFalse()
        ->and($status['closes_at'])->toBeNull()
        ->and($status['next_open_at']->toDateTimeString())->toBe('2026-03-10 08:00:00');
});

test('reports closed with next_open_at the following day, after closing', function () {
    $service = new BusinessCalendarService();

    // Tuesday 9:00 PM — 1 hour after the 8pm close.
    $at = Carbon::parse('2026-03-10 21:00:00', 'Asia/Manila');

    $status = $service->currentStatus($at);

    expect($status['is_open'])->toBeFalse()
        ->and($status['next_open_at']->toDateTimeString())->toBe('2026-03-11 08:00:00');
});

test('reports closed over the weekend with next_open_at Monday morning', function () {
    $service = new BusinessCalendarService();

    // Saturday — office closed all weekend, next open is Monday 8 AM.
    $at = Carbon::parse('2026-03-14 12:00:00', 'Asia/Manila');

    $status = $service->currentStatus($at);

    expect($status['is_open'])->toBeFalse()
        ->and($status['next_open_at']->toDateTimeString())->toBe('2026-03-16 08:00:00');
});

test('skips a declared holiday when computing next_open_at', function () {
    $service = new BusinessCalendarService();

    $calendar = BusinessCalendar::where('is_default', true)->firstOrFail();
    $calendar->holidays()->create([
        'date'  => '2026-03-11', // Wednesday
        'label' => 'Test Holiday',
    ]);

    // Tuesday 9 PM (after close) — Wednesday is a holiday, so the next
    // real opening is Thursday 8 AM, not Wednesday.
    $at = Carbon::parse('2026-03-10 21:00:00', 'Asia/Manila');

    $status = $service->currentStatus($at);

    expect($status['is_open'])->toBeFalse()
        ->and($status['next_open_at']->toDateTimeString())->toBe('2026-03-12 08:00:00');
});

test('treats the exact opening minute as open, and the exact closing minute as closed', function () {
    $service = new BusinessCalendarService();

    $calendar = $service->defaultCalendar();

    $atOpen = Carbon::parse('2026-03-10 08:00:00', 'Asia/Manila');
    expect($service->currentStatus($atOpen, $calendar->calendar_id)['is_open'])->toBeTrue();

    // minutesBetween() treats the window as [open, close) — close itself
    // is the first closed minute, so currentStatus() must agree or the
    // two would disagree about whether 8:00 PM sharp counts.
    $atClose = Carbon::parse('2026-03-10 20:00:00', 'Asia/Manila');
    expect($service->currentStatus($atClose, $calendar->calendar_id)['is_open'])->toBeFalse();
});

test('reports open with an early closes_at on a partial-cutoff day, before the cutoff', function () {
    $service = new BusinessCalendarService();

    $calendar = BusinessCalendar::where('is_default', true)->firstOrFail();
    $calendar->holidays()->create([
        'date'             => '2026-03-11', // Wednesday
        'label'            => 'Typhoon suspension',
        'type'             => 'suspension',
        'closed_from_time' => '15:00',
    ]);

    // Wednesday 10 AM — before the 3pm cutoff. The public banner should
    // say the office closes early today, not show the normal 8pm.
    $at = Carbon::parse('2026-03-11 10:00:00', 'Asia/Manila');

    $status = $service->currentStatus($at);

    expect($status['is_open'])->toBeTrue()
        ->and($status['reason'])->toBeNull()
        ->and($status['closes_at']->toDateTimeString())->toBe('2026-03-11 15:00:00');
});

test('reports closed with the exception label as the reason once the cutoff has passed', function () {
    $service = new BusinessCalendarService();

    $calendar = BusinessCalendar::where('is_default', true)->firstOrFail();
    $calendar->holidays()->create([
        'date'             => '2026-03-11', // Wednesday
        'label'            => 'Typhoon suspension',
        'type'             => 'suspension',
        'closed_from_time' => '15:00',
    ]);

    // Wednesday 4 PM — past the 3pm cutoff. Next open day (Wed's window
    // is spent) is Thursday 8 AM.
    $at = Carbon::parse('2026-03-11 16:00:00', 'Asia/Manila');

    $status = $service->currentStatus($at);

    expect($status['is_open'])->toBeFalse()
        ->and($status['reason'])->toBe('Typhoon suspension')
        ->and($status['next_open_at']->toDateTimeString())->toBe('2026-03-12 08:00:00');
});

test('does not attribute the closure reason before the cutoff has taken effect', function () {
    $service = new BusinessCalendarService();

    $calendar = BusinessCalendar::where('is_default', true)->firstOrFail();
    $calendar->holidays()->create([
        'date'             => '2026-03-11', // Wednesday
        'label'            => 'Typhoon suspension',
        'type'             => 'suspension',
        'closed_from_time' => '15:00',
    ]);

    // Wednesday 6 AM — before the normal 8am opening, same day as the
    // suspension but well before its 3pm cutoff. Closed simply because
    // the office hasn't opened yet, not because of the suspension.
    $at = Carbon::parse('2026-03-11 06:00:00', 'Asia/Manila');

    $status = $service->currentStatus($at);

    expect($status['is_open'])->toBeFalse()
        ->and($status['reason'])->toBeNull()
        ->and($status['next_open_at']->toDateTimeString())->toBe('2026-03-11 08:00:00');
});

test('falls back to the is_default calendar when no id is given', function () {
    $service = new BusinessCalendarService();

    $at = Carbon::parse('2026-03-10 10:00:00', 'Asia/Manila');

    $withoutId = $service->currentStatus($at);
    $withId    = $service->currentStatus($at, $service->defaultCalendar()->calendar_id);

    expect($withoutId)->toEqual($withId);
});