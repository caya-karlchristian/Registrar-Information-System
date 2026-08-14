<?php

use App\Models\BusinessCalendar;
use App\Services\BusinessCalendarService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;

uses(RefreshDatabase::class);

beforeEach(function () {
    config(['app.display_timezone' => 'Asia/Manila']);
});

test('counts only minutes inside the same business day window', function () {
    $service = new BusinessCalendarService();

    // Tuesday 10:00 AM -> 2:00 PM Manila time, well inside 8am-8pm.
    $start = Carbon::parse('2026-03-10 10:00:00', 'Asia/Manila'); // Tuesday
    $end   = Carbon::parse('2026-03-10 14:00:00', 'Asia/Manila');

    expect($service->minutesBetween($start, $end))->toBe(4 * 60);
});

test('clips minutes outside office hours on the same day', function () {
    $service = new BusinessCalendarService();

    // Filed 9 PM Tuesday (1 hour after close) -> 9 AM Wednesday (1 hour
    // after open). Only Wednesday 8-9 AM should count.
    $start = Carbon::parse('2026-03-10 21:00:00', 'Asia/Manila'); // Tue 9 PM
    $end   = Carbon::parse('2026-03-11 09:00:00', 'Asia/Manila'); // Wed 9 AM

    expect($service->minutesBetween($start, $end))->toBe(60);
});

test('skips weekends entirely', function () {
    $service = new BusinessCalendarService();

    // Filed Friday 9 PM (after close) -> Monday 9 AM (1 hour after open).
    // Sat/Sun are closed, so only Monday 8-9 AM should count.
    $start = Carbon::parse('2026-03-13 21:00:00', 'Asia/Manila'); // Friday 9 PM
    $end   = Carbon::parse('2026-03-16 09:00:00', 'Asia/Manila'); // Monday 9 AM

    expect($service->minutesBetween($start, $end))->toBe(60);
});

test('excludes a declared holiday from the count', function () {
    $service = new BusinessCalendarService();

    $calendar = BusinessCalendar::where('is_default', true)->firstOrFail();
    $calendar->holidays()->create([
        'date'  => '2026-03-11', // Wednesday
        'label' => 'Test Holiday',
    ]);

    // Tuesday 10 AM -> Thursday 10 AM. Wednesday is a full holiday, so only
    // Tuesday 10am-8pm (10h) + Thursday 8am-10am (2h) should count.
    $start = Carbon::parse('2026-03-10 10:00:00', 'Asia/Manila'); // Tuesday
    $end   = Carbon::parse('2026-03-12 10:00:00', 'Asia/Manila'); // Thursday

    expect($service->minutesBetween($start, $end))->toBe((10 + 2) * 60);
});

test('falls back to the is_default calendar when no id is given', function () {
    $service = new BusinessCalendarService();

    $default = $service->defaultCalendar();

    expect($default->is_default)->toBeTrue()
        ->and($default->name)->toBe('Default University Hours');
});

test('minutesBetween counts only the morning hours before a same-day cutoff', function () {
    $service = new BusinessCalendarService();

    $calendar = BusinessCalendar::where('is_default', true)->firstOrFail();
    $calendar->holidays()->create([
        'date'             => '2026-03-11', // Wednesday
        'label'            => 'Typhoon suspension',
        'type'             => 'suspension',
        'closed_from_time' => '15:00',
    ]);

    // Tuesday 10 AM -> Thursday 10 AM. Wednesday should only contribute
    // its 8am-3pm morning window (7h), not the full 8am-8pm day, and
    // Thursday resumes normally.
    $start = Carbon::parse('2026-03-10 10:00:00', 'Asia/Manila'); // Tuesday
    $end   = Carbon::parse('2026-03-12 10:00:00', 'Asia/Manila'); // Thursday

    expect($service->minutesBetween($start, $end))->toBe((10 + 7 + 2) * 60);
});

test('minutesBetween treats day 2+ of a multi-day exception as fully closed even with a cutoff on day 1', function () {
    $service = new BusinessCalendarService();

    $calendar = BusinessCalendar::where('is_default', true)->firstOrFail();
    $calendar->holidays()->create([
        'date'             => '2026-03-11', // Wednesday
        'end_date'         => '2026-03-12', // Thursday
        'label'            => 'Typhoon suspension',
        'type'             => 'suspension',
        'closed_from_time' => '15:00', // only ever applies to the start date
    ]);

    // Tuesday 10 AM -> Friday 10 AM. Wed contributes 8am-3pm (7h); Thu is
    // fully closed (day 2 of the range, cutoff doesn't apply); Fri
    // resumes with 8am-10am (2h).
    $start = Carbon::parse('2026-03-10 10:00:00', 'Asia/Manila'); // Tuesday
    $end   = Carbon::parse('2026-03-13 10:00:00', 'Asia/Manila'); // Friday

    expect($service->minutesBetween($start, $end))->toBe((10 + 7 + 0 + 2) * 60);
});

test('closed_from_time: null behaves identically to a plain full-day closure', function () {
    $service = new BusinessCalendarService();

    $calendar = BusinessCalendar::where('is_default', true)->firstOrFail();
    $calendar->holidays()->create([
        'date'             => '2026-03-11', // Wednesday
        'label'            => 'Test Holiday',
        'closed_from_time' => null,
    ]);

    $start = Carbon::parse('2026-03-10 10:00:00', 'Asia/Manila'); // Tuesday
    $end   = Carbon::parse('2026-03-12 10:00:00', 'Asia/Manila'); // Thursday

    expect($service->minutesBetween($start, $end))->toBe((10 + 2) * 60);
});

test('returns zero when end is before or equal to start', function () {
    $service = new BusinessCalendarService();

    $instant = Carbon::parse('2026-03-10 10:00:00', 'Asia/Manila');

    expect($service->minutesBetween($instant, $instant->clone()->subHour()))->toBe(0)
        ->and($service->minutesBetween($instant, $instant->clone()))->toBe(0);
});