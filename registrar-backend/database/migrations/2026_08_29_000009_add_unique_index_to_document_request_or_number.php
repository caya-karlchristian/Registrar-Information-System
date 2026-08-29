<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Closes the last gap in OR (Official Receipt) single-use enforcement:
 * until now, "one OR can only fund one request" was enforced ENTIRELY at
 * the application layer, by CashierService::isOrAlreadyUsed() — a plain
 * SELECT ... WHERE or_number = ? with no locking, run in
 * DocumentRequestController::store() strictly BEFORE the DocumentRequest
 * row is inserted.
 *
 * That is a classic check-then-act race: two submissions carrying the
 * same or_number (a double-click, a retried request, or a receipt shared
 * between two accounts) can both pass isOrAlreadyUsed() before either
 * insert commits, producing two document_request rows funded by one
 * receipt with nothing in the database to say that's wrong. There was
 * also no fallback — document_request.or_number (see
 * 2026_04_01_000000_create_base_schema) has never had a unique
 * constraint, so even a single, non-concurrent bug in the application
 * check would silently persist a duplicate.
 *
 * This migration makes the database the source of truth instead of the
 * only-ever-advisory application check: CashierService::isOrAlreadyUsed()
 * stays in place as a fast, user-friendly pre-check (so a genuine reuse
 * attempt gets a clear 422 without touching the DB layer), and
 * DocumentRequestController::store() now also catches the unique-
 * constraint violation this index produces and converts it to the exact
 * same 422 response — see that method's updated try/catch. A NULL
 * or_number (walk-in / no-OR requests) is exempt: both MySQL and SQLite
 * unique indexes treat NULL as distinct from every other NULL, so any
 * number of NULL rows remain allowed.
 *
 * PRE-REQUISITE — read before deploying to an existing database:
 * this migration WILL FAIL on `up()` if any duplicate, non-null
 * or_number values already exist (e.g. accumulated while
 * CASHIER_SINGLE_USE was off). Check first with:
 *
 *   SELECT or_number, COUNT(*) FROM document_request
 *   WHERE or_number IS NOT NULL
 *   GROUP BY or_number HAVING COUNT(*) > 1;
 *
 * Any rows returned need manual review (which of the duplicate requests
 * is the legitimate one) before this migration can run — this migration
 * deliberately does not delete or renumber existing data on its own.
 *
 * IDEMPOTENCY: written the same defensive, driver-aware way as
 * 2026_07_13_000000_add_archiving_to_document_request — MySQL/Postgres
 * get an information_schema check, SQLite (used by the test suite) gets
 * a PRAGMA-based check.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (!$this->hasIndex('document_request', 'document_request_or_number_unique')) {
            Schema::table('document_request', function (Blueprint $table) {
                $table->unique('or_number', 'document_request_or_number_unique');
            });
        }
    }

    public function down(): void
    {
        if ($this->hasIndex('document_request', 'document_request_or_number_unique')) {
            Schema::table('document_request', function (Blueprint $table) {
                $table->dropUnique('document_request_or_number_unique');
            });
        }
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
};
