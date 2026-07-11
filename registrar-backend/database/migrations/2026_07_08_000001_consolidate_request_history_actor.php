<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

/**
 * Consolidates request_history's two "who did this" columns into one.
 *
 * Found while tracing DocumentRequestService/ShredExpiredRequests/
 * AnalyticsService together:
 *
 *   - changed_by (bigint unsigned, NO FK, NO index) is the column actually
 *     written by DocumentRequestService::recordStatusHistory() for every
 *     manual admin status change (Auth::id()), and read via
 *     RequestHistory::changedBy() in RequestHistoryController.
 *   - processed_by (int, HAS an FK to users + index) is written ONLY by
 *     ShredExpiredRequests — and only ever to NULL, with processed_by_email
 *     set to the literal string 'system' as the marker for that case.
 *   - AnalyticsService::processingTime()'s "by admin" report inner-joins on
 *     processed_by, which is therefore never populated with a real user —
 *     that report has been silently returning zero rows. The frontend
 *     already guards for this (AnalyticsDashboard.jsx only renders the
 *     by-admin table when the array is non-empty), which is presumably why
 *     nobody noticed.
 *
 * Ironically, processed_by is the structurally "correct" column (it has the
 * FK the other one lacks) despite being the one nothing meaningful writes
 * to. This migration keeps changed_by — the column the app actually uses —
 * and gives it the FK/index processed_by had, rather than renaming things
 * throughout the app to match processed_by's structure.
 *
 * processed_by_email is NOT dropped: with changed_by nullable and
 * ON DELETE SET NULL, a NULL could now mean either "an automated
 * transition" or "the acting user's account was later deleted" — the
 * 'system' marker is still the only way to tell those apart. It now pairs
 * with changed_by instead of processed_by; see the code changes to
 * ShredExpiredRequests.php and AnalyticsService.php shipped alongside this
 * migration.
 *
 * IDEMPOTENCY NOTE: written the same defensive way as 2026_07_03 through
 * 2026_07_06 — every check goes through information_schema first, so this
 * is safe to re-run from any partial state.
 *
 * IMPORTANT — run before deploying to a database with real data:
 *   1. SELECT COUNT(*) FROM request_history
 *        WHERE changed_by IS NULL AND processed_by IS NOT NULL;
 *      Any rows here have a real processed_by value this migration's
 *      backfill will carry over to changed_by. Expected to be 0 based on
 *      the code trace above (nothing writes a real value to processed_by),
 *      but the backfill runs regardless as a safety net.
 *   2. SELECT rh.changed_by FROM request_history rh
 *        LEFT JOIN users u ON u.user_id = rh.changed_by
 *        WHERE rh.changed_by IS NOT NULL AND u.user_id IS NULL;
 *      Any rows returned reference a changed_by value with no matching
 *      user — the new FK will reject those until backfilled or nulled out.
 */
return new class extends Migration
{
    public function up(): void
    {
        // --- Backfill: carry over any real processed_by value before it's
        // gone. Safe no-op if processed_by has never held a real user id.
        DB::statement(
            'UPDATE request_history
             SET changed_by = processed_by
             WHERE changed_by IS NULL AND processed_by IS NOT NULL'
        );

        // --- changed_by: align type with users.user_id before adding the FK
        // changed_by is bigint unsigned; users.user_id is a signed int (the
        // same "mixed PK types" mismatch fix_schema_issues.php already had
        // to fix for announcements.created_by — error 3780, MySQL refuses
        // FKs across mismatched column types). Fixing this column, not
        // users.user_id itself, for the same reason as that migration:
        // user_id is referenced by FKs from most of the rest of the schema,
        // so it's the wrong side to touch. MySQL-only syntax (MODIFY); not
        // needed under SQLite, which has no signed/unsigned distinction.
        if (DB::getDriverName() === 'mysql') {
            DB::statement('ALTER TABLE request_history MODIFY changed_by INT NULL');
        }

        // --- changed_by: add the index + FK processed_by had -----------
        if (!$this->indexExists('request_history', 'fk_request_history_changed_by')) {
            Schema::table('request_history', function (Blueprint $table) {
                $table->index('changed_by', 'fk_request_history_changed_by');
            });
        }
        if (!$this->constraintExists('request_history', 'fk_request_history_changed_by')) {
            Schema::table('request_history', function (Blueprint $table) {
                $table->foreign('changed_by', 'fk_request_history_changed_by')
                    ->references('user_id')->on('users')
                    ->onDelete('set null');
            });
        }

        // --- processed_by: drop its FK/index, then the column itself ----
        // dropForeign/dropIndex are wrapped in try/catch rather than gated
        // on constraintExists()/indexExists(), because those helpers only
        // know how to check MySQL's information_schema and previously
        // assumed (incorrectly) that non-MySQL drivers never have
        // pre-existing state to detect. On SQLite, the FK this migration
        // is trying to drop was created by an earlier migration in this
        // same chain, so it does exist here too — skipping the drop left
        // a dangling FK that then broke dropColumn(), since SQLite has to
        // rebuild the whole table to drop a column and choked on the
        // leftover FK definition pointing at a column that was about to
        // disappear.
        //
        // SQLite specifically requires dropForeign() to be called with the
        // *column* array (['processed_by']) rather than the constraint
        // name — passing the name string throws "This database driver does
        // not support dropping foreign keys by name" (SQLiteGrammar), which
        // the try/catch below previously swallowed silently, so the FK was
        // never actually removed. MySQL needs the opposite: it must use the
        // explicit custom name, since 'fk_request_history_processed_by'
        // doesn't match Laravel's default naming convention that the
        // column-array form would derive.
        try {
            Schema::table('request_history', function (Blueprint $table) {
                if (DB::getDriverName() === 'sqlite') {
                    $table->dropForeign(['processed_by']);
                } else {
                    $table->dropForeign('fk_request_history_processed_by');
                }
            });
        } catch (\Throwable $e) {
            // Already gone (or never existed on this driver) — fine.
        }
        try {
            Schema::table('request_history', function (Blueprint $table) {
                $table->dropIndex('fk_request_history_processed_by');
            });
        } catch (\Throwable $e) {
            // Already gone (or never existed on this driver) — fine.
        }
        if (Schema::hasColumn('request_history', 'processed_by')) {
            Schema::table('request_history', function (Blueprint $table) {
                $table->dropColumn('processed_by');
            });
        }
    }

    public function down(): void
    {
        // NOTE: processed_by is restored empty (NULL for every row) — after
        // the backfill in up(), there's no way to tell which changed_by
        // values originated from the old processed_by column, so nothing
        // meaningful can be un-migrated into it.
        if (!Schema::hasColumn('request_history', 'processed_by')) {
            Schema::table('request_history', function (Blueprint $table) {
                $table->integer('processed_by')->nullable()->after('changed_by');
            });
        }
        if (!$this->indexExists('request_history', 'fk_request_history_processed_by')) {
            Schema::table('request_history', function (Blueprint $table) {
                $table->index('processed_by', 'fk_request_history_processed_by');
            });
        }
        if (!$this->constraintExists('request_history', 'fk_request_history_processed_by')) {
            Schema::table('request_history', function (Blueprint $table) {
                $table->foreign('processed_by', 'fk_request_history_processed_by')
                    ->references('user_id')->on('users')
                    ->onDelete('set null');
            });
        }

        // Same SQLite column-array-vs-name requirement as in up() — see the
        // comment there.
        try {
            Schema::table('request_history', function (Blueprint $table) {
                if (DB::getDriverName() === 'sqlite') {
                    $table->dropForeign(['changed_by']);
                } else {
                    $table->dropForeign('fk_request_history_changed_by');
                }
            });
        } catch (\Throwable $e) {
            // Already gone (or never existed on this driver) — fine.
        }
        try {
            Schema::table('request_history', fn (Blueprint $table) => $table->dropIndex('fk_request_history_changed_by'));
        } catch (\Throwable $e) {
            // Already gone (or never existed on this driver) — fine.
        }

        // Revert the type alignment from up() now that nothing constrains it.
        if (DB::getDriverName() === 'mysql') {
            DB::statement('ALTER TABLE request_history MODIFY changed_by BIGINT UNSIGNED NULL');
        }
    }

    /** True if the named index/key exists on the given table in the current database. */
    private function indexExists(string $table, string $index): bool
    {
        // information_schema.statistics is MySQL-specific. SQLite (used in
        // tests) always runs this migration against a fresh schema, so
        // there's never pre-existing state to detect.
        if (DB::getDriverName() !== 'mysql') {
            return false;
        }

        return DB::table('information_schema.statistics')
            ->whereRaw('table_schema = DATABASE()')
            ->where('table_name', $table)
            ->where('index_name', $index)
            ->exists();
    }

    /** True if the named constraint (FK, unique, or CHECK) exists on the given table. */
    private function constraintExists(string $table, string $constraint): bool
    {
        // Same reasoning as indexExists().
        if (DB::getDriverName() !== 'mysql') {
            return false;
        }

        return DB::table('information_schema.table_constraints')
            ->whereRaw('table_schema = DATABASE()')
            ->where('table_name', $table)
            ->where('constraint_name', $constraint)
            ->exists();
    }
};