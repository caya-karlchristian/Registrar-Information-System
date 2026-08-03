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

/*
|--------------------------------------------------------------------------
| Scheduled Commands — Admin/Staff Provisioning Expiry
|--------------------------------------------------------------------------
|
| 08:15  ExpireStaleProvisioning — flip any SystemUser still
|        'Pending Activation' past pending_expires_at (14 days) to
|        'Expired', and any access_requests row still 'Requested' past
|        expires_at (7 days) to 'Expired'. Kept in the same 08:xx block as
|        the jobs above; given 08:10 (not 08:05) so it never lands on the
|        same minute as announcements:auto-disable-expired.
|--------------------------------------------------------------------------
*/

Schedule::command('provisioning:expire-stale')
    ->dailyAt('08:15')
    ->withoutOverlapping()
    ->runInBackground()
    ->appendOutputTo(storage_path('logs/scheduler.log'));

/*
|--------------------------------------------------------------------------
| Scheduled Commands — Audit Log Chain Integrity
|--------------------------------------------------------------------------
|
| Nightly: recompute and verify the entire audit_logs hash chain (see
| AuditLogger::log() / AuditLog::booted() / the audit:verify command
| itself). Not called out explicitly as a scheduled job in the original
| spec — it only asked for the command to exist "for CI/cron alerting" —
| but a tamper-evidence mechanism nobody is checking is a mechanism that
| catches tampering only when someone happens to remember to run it by
| hand. Cheap (single ordered read of the table) and high-value to run
| unattended; wire the non-zero exit code into your monitoring/alerting
| the same way break-glass:test already implies below.
|--------------------------------------------------------------------------
*/

Schedule::command('audit:verify')
    ->dailyAt('03:00')
    ->withoutOverlapping()
    ->runInBackground()
    ->appendOutputTo(storage_path('logs/scheduler.log'));

/*
|--------------------------------------------------------------------------
| Scheduled Commands — Break-Glass Access Health Check
|--------------------------------------------------------------------------
|
| Weekly: verify every break-glass (local-auth) account is still
| correctly configured (Activated, has a password hash, Super Admin
| role) BEFORE an IdP outage is the first time anyone finds out one
| has drifted (e.g. deactivated, or somehow enabled on a non-super-admin
| account). Exits non-zero on failure so this can be wired into
| external monitoring/alerting on top of the scheduler log below.
|--------------------------------------------------------------------------
*/

Schedule::command('break-glass:test')
    ->weekly()
    ->withoutOverlapping()
    ->runInBackground()
    ->appendOutputTo(storage_path('logs/scheduler.log'));