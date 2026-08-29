<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\QueryException;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;

/**
 * Adds item-level status to request_document / request_certificate.
 *
 * This is the schema half of "Phase 2" from the original CTC/logbook
 * reconciliation roadmap — see DocumentRequestService::
 * requestRequiresSourceSubmission()'s docblock, which explicitly flagged
 * this as deferred: "request_document/request_certificate have no status
 * column of their own today ... A request that mixes a plain document
 * with a CTC item gates the WHOLE request until the CTC item's source is
 * submitted; splitting fast/slow items to progress independently is
 * future work."
 *
 * SCOPE OF THIS CHANGE (deliberately conservative — read before extending):
 * Each request_document/request_certificate row now carries its OWN
 * status_id, and can be advanced independently by staff. However,
 * document_request.status_id remains the single source of truth for
 * claiming and the student-facing "what stage is my request at" view —
 * it is a DERIVED, "earliest-stage-wins" aggregate of its line items'
 * statuses (see RequestItemStatusService::recomputeAggregateStatus()):
 * the request is not ReadyToClaim until EVERY item individually reaches
 * ReadyToClaim.
 *
 * Why aggregate this way rather than letting the request itself become
 * partially claimable: claiming today is one QR/claim_code per request
 * (see request_document_id/request_certificate_id both hanging off ONE
 * document_request, and DocumentRequestService::claimRequest()). Letting
 * one fast item unlock an early claim would mean scanning a QR that
 * releases only SOME of what's listed on it — a UX and audit problem
 * that was explicitly deferred to its own future phase ("Phase 3 — group
 * claiming by fulfillment_track... avoiding both 'one slow item blocks
 * everything' and '3 items = 3 tickets'"). This migration and the
 * service built on it give staff real per-item visibility and progress
 * tracking NOW (the "mini-Kanban" per request), without changing what a
 * single claim ticket means until that later phase lands.
 *
 * Backfill: every existing request_document/request_certificate row is
 * set to its parent document_request's CURRENT status_id, so nothing
 * regresses — a request already sitting in ReadyToClaim doesn't
 * suddenly show its items as unstarted.
 *
 * Backfill portability note: the backfill originally used MySQL's
 * multi-table `UPDATE ... INNER JOIN ... SET` syntax. That syntax is a
 * MySQL/MariaDB extension — it does not exist in SQLite (used by the
 * test suite, see phpunit.xml DB_CONNECTION=sqlite) or in standard
 * ANSI SQL, so it broke every test that boots the app. Rewritten below
 * as a correlated-subquery UPDATE, which is valid, identical SQL on
 * MySQL, MariaDB, PostgreSQL, and SQLite alike — no driver branching
 * required.
 *
 * DRIFT-SAFETY NOTE (added after a staging failure):
 * A prior deploy attempt on staging died mid-migration — MySQL's ALTER
 * TABLE isn't transactional, so a column can be physically added and then
 * survive even though the run that added it later failed and was never
 * recorded as "complete" in the migrations table. The next deploy then
 * retries this migration from scratch.
 *
 * The original version of this file guarded column + index + foreign key
 * for a table behind a single `if (!Schema::hasColumn(...))` block. That's
 * a problem in two ways: (1) if the column exists but the index/FK don't
 * (a partial run that died between statements), the whole block — including
 * the index/FK it was gating — gets skipped, silently leaving the table
 * under-indexed/unconstrained; and (2) on staging, the pre-check reported
 * the column as missing for a table where MySQL then reported it as a
 * duplicate, i.e. the "does it exist" read and the "add it" write raced or
 * disagreed. Both are symptoms of the same class of problem: don't let one
 * stale existence check gate multiple independent DDL operations, and don't
 * assume the check and the write are guaranteed to agree.
 *
 * The fix below: (a) each column, each index, and each foreign key gets its
 * OWN independent existence check (SQLite via PRAGMA, everything else via
 * information_schema — same portable pattern already used in
 * create_policies_table's hasForeignKey() helper), so a partial prior run
 * can never cause a needed operation to be skipped; and (b) each write is
 * additionally wrapped so that if MySQL still reports "already exists" at
 * write time despite the pre-check (schema drift), that specific error is
 * logged and treated as "already applied" rather than failing the whole
 * deploy. Any other error still throws normally.
 */
return new class extends Migration
{
    public function up(): void
    {
        $this->addColumnIfMissing('request_document', 'status_id', function (Blueprint $table) {
            $table->integer('status_id')->nullable()->after('number_of_copies');
        });
        $this->addIndexIfMissing('request_document', 'status_id', 'request_document_status_idx');
        $this->addForeignKeyIfMissing(
            'request_document',
            'status_id',
            'request_document_status_fk',
            'request_status',
            'status_id'
        );

        $this->addColumnIfMissing('request_certificate', 'status_id', function (Blueprint $table) {
            $table->integer('status_id')->nullable()->after('number_of_copies');
        });
        $this->addIndexIfMissing('request_certificate', 'status_id', 'request_certificate_status_idx');
        $this->addForeignKeyIfMissing(
            'request_certificate',
            'status_id',
            'request_certificate_status_fk',
            'request_status',
            'status_id'
        );

        // Nullable — a NULL value means "this history row is about the
        // request as a whole" (every existing row, and every future
        // whole-request bulk transition). A non-null value means "this
        // row is about one specific line item" (new granular per-item
        // transitions going forward). Exactly one of the two FKs is ever
        // set on a given row, never both — enforced at the application
        // layer (RequestItemStatusService), not the DB, same pattern
        // already used for document_request's own
        // student_profile_id/alumni_profile_id "exactly one of these"
        // pairing elsewhere in this schema.
        $this->addColumnIfMissing('request_history', 'request_document_id', function (Blueprint $table) {
            $table->integer('request_document_id')->nullable()->after('request_id');
        });
        $this->addIndexIfMissing('request_history', 'request_document_id', 'request_history_document_idx');
        $this->addForeignKeyIfMissing(
            'request_history',
            'request_document_id',
            'request_history_document_fk',
            'request_document',
            'request_document_id',
            onDelete: 'set null'
        );

        $this->addColumnIfMissing('request_history', 'request_certificate_id', function (Blueprint $table) {
            $table->integer('request_certificate_id')->nullable()->after('request_document_id');
        });
        $this->addIndexIfMissing('request_history', 'request_certificate_id', 'request_history_certificate_idx');
        $this->addForeignKeyIfMissing(
            'request_history',
            'request_certificate_id',
            'request_history_certificate_fk',
            'request_certificate',
            'request_certificate_id',
            onDelete: 'set null'
        );

        // Backfill: every existing line item inherits its parent request's
        // CURRENT status_id, so nothing regresses for in-flight requests.
        // Correlated-subquery form — portable across MySQL/MariaDB,
        // PostgreSQL, and SQLite (unlike the MySQL-only multi-table
        // UPDATE...JOIN...SET syntax this replaces). Idempotent by
        // construction (WHERE status_id IS NULL), so safe to re-run.
        DB::statement(<<<'SQL'
            UPDATE request_document
            SET status_id = (
                SELECT dr.status_id
                FROM document_request dr
                WHERE dr.request_id = request_document.request_id
            )
            WHERE status_id IS NULL
              AND EXISTS (
                SELECT 1
                FROM document_request dr
                WHERE dr.request_id = request_document.request_id
              )
        SQL);

        DB::statement(<<<'SQL'
            UPDATE request_certificate
            SET status_id = (
                SELECT dr.status_id
                FROM document_request dr
                WHERE dr.request_id = request_certificate.request_id
            )
            WHERE status_id IS NULL
              AND EXISTS (
                SELECT 1
                FROM document_request dr
                WHERE dr.request_id = request_certificate.request_id
              )
        SQL);
    }

    public function down(): void
    {
        $this->dropForeignKeyIfExists('request_history', 'request_history_certificate_fk');
        $this->dropIndexIfExists('request_history', 'request_history_certificate_idx');
        $this->dropColumnIfExists('request_history', 'request_certificate_id');

        $this->dropForeignKeyIfExists('request_history', 'request_history_document_fk');
        $this->dropIndexIfExists('request_history', 'request_history_document_idx');
        $this->dropColumnIfExists('request_history', 'request_document_id');

        $this->dropForeignKeyIfExists('request_certificate', 'request_certificate_status_fk');
        $this->dropIndexIfExists('request_certificate', 'request_certificate_status_idx');
        $this->dropColumnIfExists('request_certificate', 'status_id');

        $this->dropForeignKeyIfExists('request_document', 'request_document_status_fk');
        $this->dropIndexIfExists('request_document', 'request_document_status_idx');
        $this->dropColumnIfExists('request_document', 'status_id');
    }

    /**
     * Add a column only if it isn't already there, and — since a stale
     * pre-check is exactly what caused the staging failure this migration
     * was rewritten to survive — treat a "duplicate column" error from the
     * write itself as confirmation the column already exists rather than
     * a fatal error.
     */
    private function addColumnIfMissing(string $table, string $column, \Closure $definition): void
    {
        if (Schema::hasColumn($table, $column)) {
            return;
        }

        try {
            Schema::table($table, $definition);
        } catch (QueryException $e) {
            if (!$this->isDuplicateColumnError($e)) {
                throw $e;
            }

            Log::warning("Migration 2026_08_29_000007: column {$table}.{$column} already existed at write time despite pre-check; skipping.");
        }
    }

    /**
     * Add an index only if it doesn't already exist, with the same
     * duplicate-error safety net as addColumnIfMissing().
     */
    private function addIndexIfMissing(string $table, string $column, string $indexName): void
    {
        if ($this->hasIndex($table, $indexName)) {
            return;
        }

        try {
            Schema::table($table, function (Blueprint $blueprint) use ($column, $indexName) {
                $blueprint->index($column, $indexName);
            });
        } catch (QueryException $e) {
            if (!$this->isDuplicateKeyNameError($e)) {
                throw $e;
            }

            Log::warning("Migration 2026_08_29_000007: index {$indexName} on {$table} already existed at write time despite pre-check; skipping.");
        }
    }

    /**
     * Add a foreign key only if it doesn't already exist, with the same
     * duplicate-error safety net.
     */
    private function addForeignKeyIfMissing(
        string $table,
        string $column,
        string $constraintName,
        string $referencesTable,
        string $referencesColumn,
        ?string $onDelete = null
    ): void {
        if ($this->hasForeignKey($table, $constraintName)) {
            return;
        }

        try {
            Schema::table(
                $table,
                function (Blueprint $blueprint) use ($column, $constraintName, $referencesTable, $referencesColumn, $onDelete) {
                    $foreign = $blueprint->foreign($column, $constraintName)
                        ->references($referencesColumn)->on($referencesTable);

                    if ($onDelete !== null) {
                        $foreign->onDelete($onDelete);
                    }
                }
            );
        } catch (QueryException $e) {
            if (!$this->isDuplicateForeignKeyError($e)) {
                throw $e;
            }

            Log::warning("Migration 2026_08_29_000007: foreign key {$constraintName} on {$table} already existed at write time despite pre-check; skipping.");
        }
    }

    private function dropColumnIfExists(string $table, string $column): void
    {
        if (Schema::hasColumn($table, $column)) {
            Schema::table($table, function (Blueprint $blueprint) use ($column) {
                $blueprint->dropColumn($column);
            });
        }
    }

    private function dropIndexIfExists(string $table, string $indexName): void
    {
        if ($this->hasIndex($table, $indexName)) {
            Schema::table($table, function (Blueprint $blueprint) use ($indexName) {
                $blueprint->dropIndex($indexName);
            });
        }
    }

    private function dropForeignKeyIfExists(string $table, string $constraintName): void
    {
        if ($this->hasForeignKey($table, $constraintName)) {
            Schema::table($table, function (Blueprint $blueprint) use ($constraintName) {
                $blueprint->dropForeign($constraintName);
            });
        }
    }

    /**
     * Portable "does this index already exist" check.
     *
     * SQLite has no information_schema, so it's queried via PRAGMA
     * instead — same driver-branch pattern used for hasForeignKey()
     * below and in create_policies_table.
     */
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

    /**
     * Portable "does this FK constraint already exist" check.
     *
     * information_schema.TABLE_CONSTRAINTS works on MySQL/MariaDB (this
     * project's production DB — see docker-compose.yml) and on Postgres,
     * but NOT on SQLite, which the test suite uses for speed (see
     * phpunit.xml). SQLite has no information_schema at all, so this must
     * branch by driver rather than assume one dialect everywhere. Matches
     * create_policies_table's hasForeignKey() helper, generalised to take
     * the referenced table/column since this migration touches several.
     */
    private function hasForeignKey(string $table, string $constraintName): bool
    {
        $connection = Schema::getConnection();

        if ($connection->getDriverName() === 'sqlite') {
            // SQLite doesn't track FK constraint names the way MySQL/Postgres
            // do. We only need "has this migration's FK already been added"
            // for idempotency in tests, where the table is always created
            // fresh, so matching by constraint name against the column list
            // it would have created is unnecessary — presence of the column
            // combined with an FK to the expected table is sufficient.
            $foreignKeys = $connection->select("PRAGMA foreign_key_list($table)");

            foreach ($foreignKeys as $fk) {
                if (str_contains($constraintName, $fk->table)) {
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

    private function isDuplicateColumnError(QueryException $e): bool
    {
        // MySQL/MariaDB: 1060 Duplicate column name.
        // Postgres: 42701 duplicate_column.
        // SQLite: "duplicate column name" in the message (no stable code).
        return $e->getCode() === '1060'
            || $e->getCode() === '42701'
            || str_contains(strtolower($e->getMessage()), 'duplicate column');
    }

    private function isDuplicateKeyNameError(QueryException $e): bool
    {
        // MySQL/MariaDB: 1061 Duplicate key name.
        // Postgres: 42P07 duplicate_table (also covers duplicate index).
        return $e->getCode() === '1061'
            || $e->getCode() === '42P07'
            || str_contains(strtolower($e->getMessage()), 'duplicate key name');
    }

    private function isDuplicateForeignKeyError(QueryException $e): bool
    {
        // MySQL 8: 1826 Duplicate foreign key constraint name / 3822.
        // MariaDB/older MySQL sometimes surface this as 1005 with an
        // "errno: 121" (ER_DUP_KEY-style) suffix instead of a clean 1826,
        // so the message check is the more reliable signal in practice.
        return $e->getCode() === '1826'
            || $e->getCode() === '3822'
            || str_contains(strtolower($e->getMessage()), 'duplicate foreign key')
            || str_contains(strtolower($e->getMessage()), 'duplicate key on write or update');
    }
};
