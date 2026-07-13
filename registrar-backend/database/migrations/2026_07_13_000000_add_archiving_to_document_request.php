<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Adds soft-archive support to document_request.
 *
 * Per the "Archive Eligibility Policy – Administrator":
 *   - Any authorized admin may archive a request regardless of its
 *     current status_id (Processing, ReadyToClaim, Completed, Forfeited).
 *   - Completed / Forfeited are auto-archived by the system.
 *   - Restoring a record returns it to Active Requests with its
 *     ORIGINAL status_id unchanged.
 *
 * That last requirement is why this is a separate is_archived flag
 * rather than a synthetic "Archived" row in request_status (as the
 * frontend prototype assumed) — folding archive state into status_id
 * would destroy the original status on archive, making "restore with
 * status unchanged" impossible. This follows the same is_archived /
 * archived_on naming already used for document_type and
 * certificate_type (see 2026_07_11_000000_add_archiving_to_document_and_certificate_types),
 * plus archived_by so each archive action is individually attributable
 * (also mirrored into audit_logs via AuditLogger for the full trail).
 *
 * IDEMPOTENCY: written the same defensive, driver-aware way as
 * 2026_07_11_000001_create_policies_table — MySQL/Postgres get an
 * information_schema check, SQLite (used by the test suite, see
 * .env.testing) gets a PRAGMA-based check, since SQLite has no
 * information_schema at all.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('document_request', function (Blueprint $table) {
            if (!Schema::hasColumn('document_request', 'is_archived')) {
                $table->boolean('is_archived')->default(false)->after('status_id');
            }
            if (!Schema::hasColumn('document_request', 'archived_on')) {
                $table->timestamp('archived_on')->nullable()->after('is_archived');
            }
            if (!Schema::hasColumn('document_request', 'archived_by')) {
                $table->integer('archived_by')->nullable()->after('archived_on');
            }
        });

        if (!$this->hasIndex('document_request', 'dr_is_archived_idx')) {
            Schema::table('document_request', function (Blueprint $table) {
                $table->index('is_archived', 'dr_is_archived_idx');
            });
        }

        if (!$this->hasForeignKey('document_request', 'fk_dr_archived_by')) {
            Schema::table('document_request', function (Blueprint $table) {
                $table->foreign('archived_by', 'fk_dr_archived_by')
                    ->references('user_id')->on('users')
                    ->onDelete('set null');
            });
        }
    }

    public function down(): void
    {
        Schema::table('document_request', function (Blueprint $table) {
            if ($this->hasForeignKey('document_request', 'fk_dr_archived_by')) {
                $table->dropForeign('fk_dr_archived_by');
            }
            if ($this->hasIndex('document_request', 'dr_is_archived_idx')) {
                $table->dropIndex('dr_is_archived_idx');
            }
            $table->dropColumn(array_filter(['archived_by', 'archived_on', 'is_archived'], function ($col) {
                return Schema::hasColumn('document_request', $col);
            }));
        });
    }

    private function hasIndex(string $table, string $indexName): bool
    {
        $connection = Schema::getConnection();

        if ($connection->getDriverName() === 'sqlite') {
            $indexes = $connection->select("PRAGMA index_list($table)");
            foreach ($indexes as $index) {
                if ($index->name === $indexName) {
                    return true;
                }
            }
            return false;
        }

        $database = DB::getDatabaseName();

        $result = DB::selectOne(
            'SELECT COUNT(*) AS count
             FROM information_schema.STATISTICS
             WHERE TABLE_SCHEMA = ?
               AND TABLE_NAME = ?
               AND INDEX_NAME = ?',
            [$database, $table, $indexName]
        );

        return $result && $result->count > 0;
    }

    private function hasForeignKey(string $table, string $constraintName): bool
    {
        $connection = Schema::getConnection();

        if ($connection->getDriverName() === 'sqlite') {
            $foreignKeys = $connection->select("PRAGMA foreign_key_list($table)");
            foreach ($foreignKeys as $fk) {
                if ($fk->from === 'archived_by' && $fk->table === 'users') {
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
