<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

/*
|--------------------------------------------------------------------------
| Console Routes / Artisan Commands
|--------------------------------------------------------------------------
*/

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

/*
|--------------------------------------------------------------------------
| Scheduled Commands — Unclaimed Document Policy
|--------------------------------------------------------------------------
|
| Order matters:
|   08:00  ShredExpiredRequests    — forfeit 90-day-old unclaimed requests
|                                    BEFORE the 7-day reminder runs.
|   08:05  SendUnclaimedReminders  — send 7-day warnings for the rest.
|
| withoutOverlapping() — prevents a slow DB run from spawning a duplicate.
| runInBackground()    — keeps the scheduler process non-blocking.
| appendOutputTo()     — tails in storage/logs/scheduler.log.
|--------------------------------------------------------------------------
*/

Schedule::command('notifications:shred-expired-requests')
    ->dailyAt('08:00')
    ->withoutOverlapping()
    ->runInBackground()
    ->appendOutputTo(storage_path('logs/scheduler.log'));

Schedule::command('notifications:send-unclaimed-reminders')
    ->dailyAt('08:05')
    ->withoutOverlapping()
    ->runInBackground()
    ->appendOutputTo(storage_path('logs/scheduler.log'));

/*
|--------------------------------------------------------------------------
| Scheduled Commands — Announcement Archive Policy
|--------------------------------------------------------------------------
|
| 08:10  AutoDisableExpiredAnnouncements — disable announcements whose
|        end_date has passed, so they become eligible for archiving
|        without staff having to remember to flip the toggle. Runs after
|        the document-request jobs above just to keep the daily 08:xx
|        block together; there's no ordering dependency between them.
|--------------------------------------------------------------------------
*/

Schedule::command('announcements:auto-disable-expired')
    ->dailyAt('08:10')
    ->withoutOverlapping()
    ->runInBackground()
    ->appendOutputTo(storage_path('logs/scheduler.log'));