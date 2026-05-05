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
| Execution order matters:
|   08:00  ShredExpiredRequests    — forfeit 90-day-old unclaimed requests
|                                    BEFORE the 7-day reminder runs, so a
|                                    request expiring today is forfeited
|                                    rather than getting a reminder instead.
|   08:05  SendUnclaimedReminders  — send 7-day warnings for the remainder.
|
| withoutOverlapping() prevents a slow DB run from spawning a second
| instance if the previous one is still running.
| runInBackground() keeps the scheduler process itself non-blocking.
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
