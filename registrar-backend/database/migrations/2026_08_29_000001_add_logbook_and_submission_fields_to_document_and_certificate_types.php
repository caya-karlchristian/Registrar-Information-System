<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Adds two columns to document_type and certificate_type:
 *
 * - logbook_category_id (nullable FK -> logbook_category): which umbrella
 *   logbook line this type rolls up under. NULL = log under this row's own
 *   name (see logbook_category migration docblock for why this is the
 *   common case, not the exception).
 *
 * - requires_source_submission (boolean, default false): whether a
 *   request for this type must sit gated until the client physically
 *   hands over a source document before Registrar staff can even start
 *   processing it (the CTC / Authentication Fee case — you can't certify
 *   a copy of something you don't have in hand yet).
 *
 *   This is a plain per-row flag rather than a shared "processing
 *   profile" table on purpose: the existing Add Document screen already
 *   enters process period and every other behavior per-row, not from a
 *   shared template, so a flag here matches that established convention
 *   instead of introducing a new, inconsistent pattern alongside it.
 *
 * Added to BOTH tables for schema symmetry (access_id, cashier_document_
 * patterns, and now logbook_category_id already mirror across both) even
 * though requires_source_submission is expected to stay false on
 * certificate_type — certificates are generated in-system, so "awaiting a
 * source document from the client" doesn't apply there today. Kept for
 * consistency and in case a future certificate type needs similar gating
 * (e.g. an external-agency dependency).
 *
 * Written the same idempotent, re-runnable way as the rest of this
 * migration set (see 2026_07_11_000000_add_archiving_to_document_and_
 * certificate_types.php).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('document_type', function (Blueprint $table) {
            if (!Schema::hasColumn('document_type', 'logbook_category_id')) {
                $table->integer('logbook_category_id')->nullable()->after('access_id');
            }
            if (!Schema::hasColumn('document_type', 'requires_source_submission')) {
                $table->boolean('requires_source_submission')->default(false)->after('logbook_category_id');
            }
        });

        Schema::table('certificate_type', function (Blueprint $table) {
            if (!Schema::hasColumn('certificate_type', 'logbook_category_id')) {
                $table->integer('logbook_category_id')->nullable()->after('access_id');
            }
            if (!Schema::hasColumn('certificate_type', 'requires_source_submission')) {
                $table->boolean('requires_source_submission')->default(false)->after('logbook_category_id');
            }
        });

        // FKs added as a separate step, guarded via a portable existence
        // check, so this stays safely re-runnable even from a
        // partially-applied state.
        if (!$this->hasForeignKey('document_type', 'document_type_logbook_category_fk', 'logbook_category_id', 'logbook_category')) {
            Schema::table('document_type', function (Blueprint $table) {
                $table->foreign('logbook_category_id', 'document_type_logbook_category_fk')
                    ->references('logbook_category_id')->on('logbook_category')
                    ->nullOnDelete();
            });
        }

        if (!$this->hasForeignKey('certificate_type', 'certificate_type_logbook_category_fk', 'logbook_category_id', 'logbook_category')) {
            Schema::table('certificate_type', function (Blueprint $table) {
                $table->foreign('logbook_category_id', 'certificate_type_logbook_category_fk')
                    ->references('logbook_category_id')->on('logbook_category')
                    ->nullOnDelete();
            });
        }
    }

    public function down(): void
    {
        if ($this->hasForeignKey('document_type', 'document_type_logbook_category_fk', 'logbook_category_id', 'logbook_category')) {
            Schema::table('document_type', function (Blueprint $table) {
                $table->dropForeign('document_type_logbook_category_fk');
            });
        }
        Schema::table('document_type', function (Blueprint $table) {
            if (Schema::hasColumn('document_type', 'requires_source_submission')) {
                $table->dropColumn('requires_source_submission');
            }
            if (Schema::hasColumn('document_type', 'logbook_category_id')) {
                $table->dropColumn('logbook_category_id');
            }
        });

        if ($this->hasForeignKey('certificate_type', 'certificate_type_logbook_category_fk', 'logbook_category_id', 'logbook_category')) {
            Schema::table('certificate_type', function (Blueprint $table) {
                $table->dropForeign('certificate_type_logbook_category_fk');
            });
        }
        Schema::table('certificate_type', function (Blueprint $table) {
            if (Schema::hasColumn('certificate_type', 'requires_source_submission')) {
                $table->dropColumn('requires_source_submission');
            }
            if (Schema::hasColumn('certificate_type', 'logbook_category_id')) {
                $table->dropColumn('logbook_category_id');
            }
        });
    }

    /**
     * Portable "does this FK constraint already exist" check.
     *
     * information_schema.TABLE_CONSTRAINTS works on MySQL/MariaDB (this
     * project's production DB — see config/database.php) and on Postgres,
     * but NOT on SQLite, which the test suite uses for speed (see
     * phpunit.xml, DB_CONNECTION=sqlite, DB_DATABASE=:memory:). SQLite has
     * no information_schema at all, so this must branch by driver rather
     * than assume one dialect everywhere — same approach already used in
     * 2026_07_11_000001_create_policies_table.php.
     *
     * @param  string  $table            Table the FK lives on.
     * @param  string  $constraintName   Named constraint (MySQL/Postgres path only).
     * @param  string  $column           Local column the FK is defined on (SQLite path).
     * @param  string  $referencesTable  Table the FK points to (SQLite path).
     */
    private function hasForeignKey(string $table, string $constraintName, string $column, string $referencesTable): bool
    {
        $connection = Schema::getConnection();

        if ($connection->getDriverName() === 'sqlite') {
            // SQLite doesn't track FK constraint names the way MySQL/Postgres
            // do, so we approximate "does this FK already exist" by matching
            // on the (from column, referenced table) pair instead of the
            // constraint name — sufficient for this migration's idempotency
            // purposes, since in tests the table is always created fresh.
            $foreignKeys = $connection->select("PRAGMA foreign_key_list($table)");

            foreach ($foreignKeys as $fk) {
                if ($fk->from === $column && $fk->table === $referencesTable) {
                    return true;
                }
            }

            return false;
        }

        $database = $connection->getDatabaseName();

        $result = $connection->selectOne(
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
