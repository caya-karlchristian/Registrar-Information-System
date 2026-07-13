<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Adds real archive support to `announcements`.
 *
 * Previously SystemSettings.jsx archived announcements with a
 * MOCK_ARCHIVED_ANNOUNCEMENTS constant and local component state only —
 * nothing was persisted, and a refresh silently un-archived everything.
 * This gives the table the same is_archived / archived_on / archived_by
 * shape already used for document_type, certificate_type, and
 * document_request, so AnnouncementService can persist archive/restore
 * the same way DocumentRequestService does.
 *
 * `end_date` is new and optional: per the announcement archive policy,
 * an announcement with a scheduled end date that has passed can be
 * auto-disabled by a scheduled command (see AutoDisableExpiredAnnouncements),
 * which makes it eligible for archiving without staff having to remember
 * to flip the Enable toggle themselves. Nullable — most announcements have
 * no end date and stay manually managed.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('announcements', function (Blueprint $table) {
            if (!Schema::hasColumn('announcements', 'end_date')) {
                $table->date('end_date')->nullable()->after('enabled');
            }
            if (!Schema::hasColumn('announcements', 'is_archived')) {
                $table->boolean('is_archived')->default(false)->after('end_date');
            }
            if (!Schema::hasColumn('announcements', 'archived_on')) {
                $table->timestamp('archived_on')->nullable()->after('is_archived');
            }
            if (!Schema::hasColumn('announcements', 'archived_by')) {
                $table->integer('archived_by')->nullable()->after('archived_on');
            }
        });

        if (!$this->hasIndex('announcements', 'announcements_is_archived_idx')) {
            Schema::table('announcements', function (Blueprint $table) {
                $table->index('is_archived', 'announcements_is_archived_idx');
            });
        }

        if (!$this->hasForeignKey('announcements')) {
            Schema::table('announcements', function (Blueprint $table) {
                $table->foreign('archived_by', 'fk_announcements_archived_by')
                    ->references('user_id')->on('users')
                    ->onDelete('set null');
            });
        }
    }

    public function down(): void
    {
        Schema::table('announcements', function (Blueprint $table) {
            if ($this->hasForeignKey('announcements')) {
                $table->dropForeign('fk_announcements_archived_by');
            }
            if ($this->hasIndex('announcements', 'announcements_is_archived_idx')) {
                $table->dropIndex('announcements_is_archived_idx');
            }
            $table->dropColumn(array_filter(
                ['archived_by', 'archived_on', 'is_archived', 'end_date'],
                fn ($col) => Schema::hasColumn('announcements', $col)
            ));
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

    private function hasForeignKey(string $table): bool
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
            [$database, $table, 'fk_announcements_archived_by']
        );

        return $result && $result->count > 0;
    }
};
