<?php

use App\Models\BusinessCalendar;
use App\Models\BusinessCalendarHoliday;
use App\Services\BusinessCalendarService;
use App\Services\CalendarExceptionService;
use App\Services\CalendarOverrideService;
use App\Models\SystemUser;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Validation\ValidationException;

uses(RefreshDatabase::class);

beforeEach(function () {
    config(['app.display_timezone' => 'Asia/Manila']);
});

test('a multi-day exception closes every day in its range', function () {
    $service = new BusinessCalendarService();
    $calendar = BusinessCalendar::where('is_default', true)->firstOrFail();

    // 3-day suspension: Wed-Fri.
    $calendar->holidays()->create([
        'type'     => 'suspension',
        'label'    => 'Typhoon suspension',
        'date'     => '2026-03-11', // Wed
        'end_date' => '2026-03-13', // Fri
    ]);

    // Tuesday 10 AM -> Monday 10 AM. Only Tue (10h) + Mon (2h) should count;
    // Wed/Thu/Fri suspended, Sat/Sun already closed.
    $start = Carbon::parse('2026-03-10 10:00:00', 'Asia/Manila'); // Tuesday
    $end   = Carbon::parse('2026-03-16 10:00:00', 'Asia/Manila'); // Monday

    expect($service->minutesBetween($start, $end))->toBe((10 + 2) * 60);
});

test('a dated exception takes precedence over a recurring override on the same day', function () {
    $service = new BusinessCalendarService();
    $calendar = BusinessCalendar::where('is_default', true)->firstOrFail();

    // Every Wednesday closed (WFH), starting well before our test window.
    $calendar->overrides()->create([
        'day_of_week'     => 'wednesday',
        'is_closed'       => true,
        'label'           => 'WFH Wednesday',
        'effective_from'  => '2026-01-01',
        'effective_until' => null,
    ]);

    // But THIS particular Wednesday is also a declared event day — the
    // exception's label should win as the reason, and the day is still
    // simply closed either way (this test locks in that exceptions are
    // checked first, per the service's documented precedence).
    $calendar->holidays()->create([
        'type'     => 'event',
        'label'    => 'Mosquito fogging',
        'date'     => '2026-03-11',
        'end_date' => '2026-03-11',
    ]);

    $status = $service->currentStatus(Carbon::parse('2026-03-11 10:00:00', 'Asia/Manila'));

    expect($status['is_open'])->toBeFalse()
        ->and($status['reason'])->toBe('Mosquito fogging');
});

test('an indefinite recurring override (no effective_until) closes every matching weekday', function () {
    $service = new BusinessCalendarService();
    $calendar = BusinessCalendar::where('is_default', true)->firstOrFail();

    $calendar->overrides()->create([
        'day_of_week'     => 'monday',
        'is_closed'       => true,
        'label'           => 'WFH Monday',
        'effective_from'  => '2026-03-02',
        'effective_until' => null, // "until further notice"
    ]);

    // Two Mondays, weeks apart — both should be closed since there's no end date.
    foreach (['2026-03-09', '2026-06-15'] as $monday) {
        $status = $service->currentStatus(Carbon::parse("{$monday} 10:00:00", 'Asia/Manila'));
        expect($status['is_open'])->toBeFalse()
            ->and($status['reason'])->toBe('WFH Monday');
    }
});

test('an override with a set effective_until stops applying after that date', function () {
    $service = new BusinessCalendarService();
    $calendar = BusinessCalendar::where('is_default', true)->firstOrFail();

    $calendar->overrides()->create([
        'day_of_week'     => 'monday',
        'is_closed'       => true,
        'label'           => 'WFH Monday',
        'effective_from'  => '2026-03-02',
        'effective_until' => '2026-03-30',
    ]);

    // A Monday after the policy ended should be a normal open Monday.
    $status = $service->currentStatus(Carbon::parse('2026-04-06 10:00:00', 'Asia/Manila'));

    expect($status['is_open'])->toBeTrue();
});

test('currentStatus reason is null for an ordinary weekend, not a fabricated label', function () {
    $service = new BusinessCalendarService();

    $status = $service->currentStatus(Carbon::parse('2026-03-14 10:00:00', 'Asia/Manila')); // Saturday

    expect($status['is_open'])->toBeFalse()
        ->and($status['reason'])->toBeNull();
});

test('updating only the start date of a multi-day exception does not collapse its range', function () {
    $calendar = BusinessCalendar::where('is_default', true)->firstOrFail();

    $exception = $calendar->holidays()->create([
        'type'     => 'suspension',
        'label'    => 'Multi-day suspension',
        'date'     => '2026-03-11',
        'end_date' => '2026-03-13',
    ]);

    $service = app(CalendarExceptionService::class);
    $actor = SystemUser::factory()->create(['role_id' => SystemUser::ROLE_SUPER_ADMIN]);

    $updated = $service->update($exception, ['date' => '2026-03-10'], $actor, Request::create('/'));

    // end_date must still be 03-13 — only the start moved.
    expect($updated->date->toDateString())->toBe('2026-03-10')
        ->and($updated->end_date->toDateString())->toBe('2026-03-13');
});

test('two overlapping exceptions on the same calendar are rejected', function () {
    $calendar = BusinessCalendar::where('is_default', true)->firstOrFail();
    $calendar->holidays()->create([
        'type' => 'event', 'label' => 'First', 'date' => '2026-03-11', 'end_date' => '2026-03-13',
    ]);

    $service = app(CalendarExceptionService::class);
    $actor = SystemUser::factory()->create(['role_id' => SystemUser::ROLE_SUPER_ADMIN]);

    expect(fn () => $service->create([
        'type' => 'suspension', 'label' => 'Overlaps', 'date' => '2026-03-12', 'end_date' => '2026-03-14',
    ], $actor, Request::create('/')))->toThrow(ValidationException::class);
});
