<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Adds restored_on / restored_by to document_request.
 *
 * document_request already tracks WHO archived a request via
 * archived_on/archived_by (see 2026_07_13_000000_add_archiving_to_document_request),
 * but restoreRequests() had nowhere to persist the mirror image of that —
 * DocumentRequestService::restoreRequests() accepted a SystemUser $actor
 * parameter but never used it, so a restored row went back to looking
 * exactly like it had never been archived at all. The bulk-restore
 * *action* was still fully audit-logged (AuditLog::ACTION_REQUEST_RESTORED,
 * written by DocumentRequestController), but the record itself carried no
 * row-level attribution — every other archive-lifecycle table in this
 * schema (document_type, certificate_type, announcements) keeps that
 * attribution on the row, not just in the audit log, so this brings
 * document_request in line with the rest of the schema.
 *
 * IDEMPOTENCY: written the same defensive, driver-aware way as
 * 2026_07_13_000000_add_archiving_to_document_request — MySQL/Postgres get
 * an information_schema check, SQLite (used by the test suite) gets a
 * PRAGMA-based check.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('document_request', function (Blueprint $table) {
            if (!Schema::hasColumn('document_request', 'restored_on')) {
                $table->timestamp('restored_on')->nullable()->after('archived_by');
            }
            if (!Schema::hasColumn('document_request', 'restored_by')) {
                $table->integer('restored_by')->nullable()->after('restored_on');
            }
        });

        if (!$this->hasForeignKey('document_request', 'fk_dr_restored_by')) {
            Schema::table('document_request', function (Blueprint $table) {
                $table->foreign('restored_by', 'fk_dr_restored_by')
                    ->references('user_id')->on('users')
                    ->onDelete('set null');
            });
        }
    }

    public function down(): void
    {
        Schema::table('document_request', function (Blueprint $table) {
            if ($this->hasForeignKey('document_request', 'fk_dr_restored_by')) {
                $table->dropForeign('fk_dr_restored_by');
            }
            $table->dropColumn(array_filter(['restored_by', 'restored_on'], function ($col) {
                return Schema::hasColumn('document_request', $col);
            }));
        });
    }

    private function hasForeignKey(string $table, string $constraintName): bool
    {
        $connection = Schema::getConnection();

        if ($connection->getDriverName() === 'sqlite') {
            $foreignKeys = $connection->select("PRAGMA foreign_key_list($table)");
            foreach ($foreignKeys as $fk) {
                if ($fk->from === 'restored_by' && $fk->table === 'users') {
                    return true;
                }
            }
            return false;
        }

        $database = DB::getDatabaseName();

        $result = DB::selectOne(
            'SELECT COUNT(*) AS count
             FROM information_schema.TABLE_CONSTRAINTS
             WHERE CONSTRAINT_SCHEMA = ?
               AND TABLE_NAME = ?
               AND CONSTRAINT_NAME = ?
               AND CONSTRAINT_TYPE = "FOREIGN KEY"',
            [$database, $table, $constraintName]
        );

        return $result && $result->count > 0;
    }
};
