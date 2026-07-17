<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Adds `archived_by` to document_type and certificate_type.
 *
 * 2026_07_11_000000 added is_archived/archived_on to these two tables but
 * stopped short of attribution — there was no column recording WHO archived
 * a type, only when. That made it impossible to answer "who archived this"
 * without trawling audit_logs by hand. This mirrors the archived_by column
 * already added to document_request (2026_07_13_000000), including the same
 * SQLite-aware idempotency checks (the test suite runs on SQLite, which has
 * no information_schema).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('document_type', function (Blueprint $table) {
            if (!Schema::hasColumn('document_type', 'archived_by')) {
                $table->integer('archived_by')->nullable()->after('archived_on');
            }
        });

        Schema::table('certificate_type', function (Blueprint $table) {
            if (!Schema::hasColumn('certificate_type', 'archived_by')) {
                $table->integer('archived_by')->nullable()->after('archived_on');
            }
        });

        if (!$this->hasForeignKey('document_type', 'fk_document_type_archived_by')) {
            Schema::table('document_type', function (Blueprint $table) {
                $table->foreign('archived_by', 'fk_document_type_archived_by')
                    ->references('user_id')->on('users')
                    ->onDelete('set null');
            });
        }

        if (!$this->hasForeignKey('certificate_type', 'fk_certificate_type_archived_by')) {
            Schema::table('certificate_type', function (Blueprint $table) {
                $table->foreign('archived_by', 'fk_certificate_type_archived_by')
                    ->references('user_id')->on('users')
                    ->onDelete('set null');
            });
        }
    }

    public function down(): void
    {
        Schema::table('document_type', function (Blueprint $table) {
            if ($this->hasForeignKey('document_type', 'fk_document_type_archived_by')) {
                $table->dropForeign('fk_document_type_archived_by');
            }
            if (Schema::hasColumn('document_type', 'archived_by')) {
                $table->dropColumn('archived_by');
            }
        });

        Schema::table('certificate_type', function (Blueprint $table) {
            if ($this->hasForeignKey('certificate_type', 'fk_certificate_type_archived_by')) {
                $table->dropForeign('fk_certificate_type_archived_by');
            }
            if (Schema::hasColumn('certificate_type', 'archived_by')) {
                $table->dropColumn('archived_by');
            }
        });
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
