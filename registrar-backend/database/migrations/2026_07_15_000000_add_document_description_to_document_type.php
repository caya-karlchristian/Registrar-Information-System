<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Adds document_type.document_description, which exists on the live
 * database (confirmed via schema dump) but was never captured by any
 * migration — it was evidently added directly against the database at
 * some point, bypassing Laravel's migration system.
 *
 * The application already assumes this column exists:
 *   - DocumentType::$fillable includes 'document_description'
 *   - DocumentTypeController validates it ('nullable|string') on both
 *     create and update
 *
 * On production the column is `text NOT NULL` with no default. Since
 * TEXT columns can't carry a literal DEFAULT in MySQL, existing rows are
 * backfilled to an empty string before the NOT NULL constraint is
 * applied, so this is safe to run against a database that already has
 * document_type rows.
 *
 * IDEMPOTENCY: written the same defensive way as the rest of this
 * migration batch (2026_07_03 onward) — safe to re-run from any partial
 * state.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasColumn('document_type', 'document_description')) {
            Schema::table('document_type', function (Blueprint $table) {
                $table->text('document_description')->nullable()->after('document_name');
            });
        }

        // Backfill any existing rows (fresh installs will have none) so the
        // NOT NULL constraint below can't fail.
        DB::table('document_type')
            ->whereNull('document_description')
            ->update(['document_description' => '']);

        // MySQL-only MODIFY, matching the style already used elsewhere in
        // this migration set (fix_schema_issues.php, etc.) to avoid a
        // doctrine/dbal dependency on Blueprint::change(). Not needed under
        // SQLite, which is dynamically typed per-column.
        if (DB::getDriverName() === 'mysql') {
            DB::statement('ALTER TABLE document_type MODIFY document_description TEXT NOT NULL');
        }
    }

    public function down(): void
    {
        if (Schema::hasColumn('document_type', 'document_description')) {
            Schema::table('document_type', function (Blueprint $table) {
                $table->dropColumn('document_description');
            });
        }
    }
};
