<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Tamper-evident audit log: each row now stores prev_hash (the previous
 * row's hash, '0' for the very first row) and hash (sha256 of prev_hash +
 * this row's own final field values — see AuditLogger::log() for the exact
 * algorithm, which this migration's backfill mirrors precisely so
 * `audit:verify` treats pre-migration rows identically to new ones).
 *
 * Walking the chain and recomputing every hash (see the audit:verify
 * command) detects any row that was altered after the fact by anything
 * other than this application's own insert path — combined with the
 * append-only guard on the AuditLog model (static::updating()/deleting()),
 * which blocks in-place edits and deletes at the application layer.
 *
 * Existing rows (if any) are backfilled in id order so the chain is
 * unbroken from the very first audit_logs row ever written, not just from
 * the moment this migration ran.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasColumn('audit_logs', 'hash')) {
            return;
        }

        Schema::table('audit_logs', function (Blueprint $table) {
            $table->string('prev_hash', 64)->nullable()->after('metadata');
            // Nullable at the DB level only to allow the backfill loop below
            // to populate it row by row; the application layer
            // (AuditLogger::log()) always writes a value on every future
            // insert, so in practice this column is never actually null
            // once this migration finishes.
            $table->string('hash', 64)->nullable()->after('prev_hash');

            $table->index('hash', 'idx_audit_logs_hash');
        });

        $previousHash = '0';

        DB::table('audit_logs')
            ->orderBy('id')
            ->select(['id', 'user_id', 'target_user_id', 'target_email', 'action', 'created_at'])
            ->chunkById(500, function ($rows) use (&$previousHash) {
                foreach ($rows as $row) {
                    $hash = hash('sha256', $previousHash . '|' . json_encode([
                        'action'          => $row->action,
                        'user_id'         => $row->user_id,
                        'target_user_id'  => $row->target_user_id,
                        'target_email'    => $row->target_email,
                        'created_at'      => (string) $row->created_at,
                    ]));

                    DB::table('audit_logs')
                        ->where('id', $row->id)
                        ->update(['prev_hash' => $previousHash, 'hash' => $hash]);

                    $previousHash = $hash;
                }
            });
    }

    public function down(): void
    {
        if (!Schema::hasColumn('audit_logs', 'hash')) {
            return;
        }

        Schema::table('audit_logs', function (Blueprint $table) {
            $table->dropIndex('idx_audit_logs_hash');
            $table->dropColumn(['prev_hash', 'hash']);
        });
    }
};
