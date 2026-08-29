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

        // FKs added as a separate step, guarded via information_schema, so
        // this stays safely re-runnable even from a partially-applied state.
        if (!$this->hasForeignKey('document_type', 'document_type_logbook_category_fk')) {
            Schema::table('document_type', function (Blueprint $table) {
                $table->foreign('logbook_category_id', 'document_type_logbook_category_fk')
                    ->references('logbook_category_id')->on('logbook_category')
                    ->nullOnDelete();
            });
        }

        if (!$this->hasForeignKey('certificate_type', 'certificate_type_logbook_category_fk')) {
            Schema::table('certificate_type', function (Blueprint $table) {
                $table->foreign('logbook_category_id', 'certificate_type_logbook_category_fk')
                    ->references('logbook_category_id')->on('logbook_category')
                    ->nullOnDelete();
            });
        }
    }

    public function down(): void
    {
        if ($this->hasForeignKey('document_type', 'document_type_logbook_category_fk')) {
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

        if ($this->hasForeignKey('certificate_type', 'certificate_type_logbook_category_fk')) {
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
     * Whether a named foreign key constraint already exists on a table.
     * Schema::hasColumn() has no FK equivalent, so this checks
     * information_schema directly. Safe for this app's MySQL/MariaDB
     * target (see config/database.php).
     */
    private function hasForeignKey(string $table, string $constraintName): bool
    {
        $connection = Schema::getConnection();
        $database = $connection->getDatabaseName();

        return $connection->table('information_schema.TABLE_CONSTRAINTS')
            ->where('CONSTRAINT_SCHEMA', $database)
            ->where('TABLE_NAME', $table)
            ->where('CONSTRAINT_NAME', $constraintName)
            ->where('CONSTRAINT_TYPE', 'FOREIGN KEY')
            ->exists();
    }
};
