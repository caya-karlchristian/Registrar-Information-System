<?php

use App\Models\AuditLog;
use App\Models\SystemUser;
use App\Services\AuditLogger;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Request;

uses(RefreshDatabase::class);

function actActor(): SystemUser
{
    return SystemUser::factory()->create(['role_id' => SystemUser::ROLE_SUPER_ADMIN, 'status' => 'Activated']);
}

// ═════════════════════════════════════════════════════════════════════════════
// AuditLogger — hash chain construction
// ═════════════════════════════════════════════════════════════════════════════

test('the first audit log row chains from genesis prev_hash "0"', function () {
    $actor = actActor();
    $logger = app(AuditLogger::class);

    $row = $logger->log(Request::create('/', 'POST'), $actor, AuditLog::ACTION_LOGIN);

    expect($row->prev_hash)->toBe('0');
    expect($row->hash)->not->toBeEmpty();
});

test('each subsequent row chains prev_hash to the previous row\'s hash', function () {
    $actor = actActor();
    $logger = app(AuditLogger::class);

    $first  = $logger->log(Request::create('/', 'POST'), $actor, AuditLog::ACTION_LOGIN);
    $second = $logger->log(Request::create('/', 'POST'), $actor, AuditLog::ACTION_LOGOUT);

    expect($second->prev_hash)->toBe($first->hash);
    expect($second->hash)->not->toBe($first->hash);
});

test('AuditLog rows cannot be updated or deleted at the application layer', function () {
    $actor = actActor();
    $logger = app(AuditLogger::class);
    $row = $logger->log(Request::create('/', 'POST'), $actor, AuditLog::ACTION_LOGIN);

    expect(fn () => $row->update(['action' => 'tampered']))->toThrow(RuntimeException::class);
    expect(fn () => $row->delete())->toThrow(RuntimeException::class);
});

// ═════════════════════════════════════════════════════════════════════════════
// `php artisan audit:verify`
// ═════════════════════════════════════════════════════════════════════════════

test('audit:verify passes on an untampered chain', function () {
    $actor = actActor();
    $logger = app(AuditLogger::class);
    $logger->log(Request::create('/', 'POST'), $actor, AuditLog::ACTION_LOGIN);
    $logger->log(Request::create('/', 'POST'), $actor, AuditLog::ACTION_LOGOUT);
    $logger->log(Request::create('/', 'POST'), $actor, AuditLog::ACTION_ADMIN_CREATED);

    $this->artisan('audit:verify')->assertExitCode(0);
});

test('audit:verify passes on an empty table', function () {
    $this->artisan('audit:verify')->assertExitCode(0);
});

test('audit:verify fails when a row\'s hash is tampered with directly at the DB level', function () {
    $actor = actActor();
    $logger = app(AuditLogger::class);
    $logger->log(Request::create('/', 'POST'), $actor, AuditLog::ACTION_LOGIN);
    $row = $logger->log(Request::create('/', 'POST'), $actor, AuditLog::ACTION_LOGOUT);

    // Bypass the model's append-only guard the way a rogue direct SQL
    // statement would — this is exactly the scenario audit:verify exists
    // to detect, since the application layer alone can't prevent it.
    \Illuminate\Support\Facades\DB::table('audit_logs')
        ->where('id', $row->id)
        ->update(['action' => 'tampered_action']);

    $this->artisan('audit:verify')->assertExitCode(1);
});

test('audit:verify fails when a row is deleted directly at the DB level, breaking the chain', function () {
    $actor = actActor();
    $logger = app(AuditLogger::class);
    $logger->log(Request::create('/', 'POST'), $actor, AuditLog::ACTION_LOGIN);
    $middle = $logger->log(Request::create('/', 'POST'), $actor, AuditLog::ACTION_LOGOUT);
    $logger->log(Request::create('/', 'POST'), $actor, AuditLog::ACTION_ADMIN_CREATED);

    \Illuminate\Support\Facades\DB::table('audit_logs')->where('id', $middle->id)->delete();

    $this->artisan('audit:verify')->assertExitCode(1);
});
