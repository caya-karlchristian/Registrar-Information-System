<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * Adds a CHECK constraint on request_document.number_of_copies restricting
 * it to 1–10.
 *
 * This constraint already exists on the live database (as the
 * auto-generated name request_document_chk_1, confirmed via schema dump),
 * but no migration ever created it — like document_description on
 * document_type, it was added directly against the database, bypassing
 * migrations.
 *
 * Named explicitly here (chk_rd_copies_range) rather than relying on
 * MySQL's auto-generated request_document_chk_1, so it's predictable and
 * drop-able by name on any environment this migration creates it on.
 *
 * DETECTION NOTE: production already has this exact constraint, but under
 * MySQL's auto-generated name (request_document_chk_1), not the explicit
 * name this migration uses. A name-only existence check would miss that
 * and add a second, duplicate constraint on production. So the guard below
 * checks CHECK_CONSTRAINTS.CHECK_CLAUSE content instead of a specific
 * name — it matches request_document_chk_1 on production (skips creating
 * a duplicate) and finds nothing on local/staging (creates it there with
 * the clean explicit name).
 *
 * NOTE: request_certificate has an identical number_of_copies column with
 * no equivalent constraint in production — that inconsistency is left
 * as-is here, since this migration's job is only to make the schema
 * definition match what's actually deployed, not to redesign it. If the
 * same constraint should apply to request_certificate, that's a separate,
 * deliberate migration.
 *
 * IDEMPOTENCY: written the same defensive way as the rest of this
 * migration batch — checks current state via information_schema before
 * acting, safe to re-run from any partial state.
 *
 * MySQL-only: SQLite (used by the test suite) can't ALTER TABLE ADD
 * CONSTRAINT on an existing table without a full rebuild, matching how
 * chk_dr_student_xor_alumni was handled in fix_schema_issues.php.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (DB::getDriverName() === 'mysql' && !$this->copiesRangeCheckExists()) {
            DB::statement(<<<SQL
                ALTER TABLE request_document
                ADD CONSTRAINT chk_rd_copies_range CHECK (number_of_copies BETWEEN 1 AND 10)
            SQL);
        }
    }

    public function down(): void
    {
        // Only drops the explicitly-named constraint this migration creates.
        // If a differently-named equivalent constraint (e.g. production's
        // request_document_chk_1) already existed before this migration
        // ran, it's left alone — this migration didn't create it, so it's
        // not this migration's place to remove it on rollback.
        if (DB::getDriverName() === 'mysql' && $this->constraintExists('request_document', 'chk_rd_copies_range')) {
            DB::statement('ALTER TABLE request_document DROP CONSTRAINT chk_rd_copies_range');
        }
    }

    /**
     * True if request_document already has ANY check constraint enforcing
     * the 1–10 range on number_of_copies, under any name — catches both
     * this migration's own chk_rd_copies_range and MySQL's auto-generated
     * request_document_chk_1 (already present on production).
     */
    private function copiesRangeCheckExists(): bool
    {
        $result = DB::selectOne(
            "SELECT COUNT(*) AS count
             FROM information_schema.CHECK_CONSTRAINTS cc
             JOIN information_schema.TABLE_CONSTRAINTS tc
               ON tc.CONSTRAINT_SCHEMA = cc.CONSTRAINT_SCHEMA
              AND tc.CONSTRAINT_NAME = cc.CONSTRAINT_NAME
             WHERE tc.CONSTRAINT_SCHEMA = DATABASE()
               AND tc.TABLE_NAME = 'request_document'
               AND cc.CHECK_CLAUSE LIKE '%number_of_copies%'"
        );

        return $result && $result->count > 0;
    }

    /** True if the named constraint (FK, unique, or CHECK) exists on the given table. */
    private function constraintExists(string $table, string $constraint): bool
    {
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