<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * Drops chk_dr_student_xor_alumni from document_request.
 *
 * document_request has two CHECK constraints enforcing the student/alumni
 * exclusive-arc:
 *
 *   - chk_dr_requester (pre-existing, stricter): requires student_profile_id
 *     AND student_academic_id together, XOR alumni_profile_id AND
 *     alumni_academic_id together.
 *   - chk_dr_student_xor_alumni (added by fix_schema_issues.php): only
 *     checks student_profile_id XOR alumni_profile_id.
 *
 * Any row satisfying chk_dr_requester automatically satisfies
 * chk_dr_student_xor_alumni — the second constraint can never reject a row
 * the first one accepts, so it's pure dead weight, not an extra safety net.
 * This was flagged but intentionally left in place during the
 * fix_schema_issues.php pass; removing it now as part of this cleanup
 * batch.
 *
 * IDEMPOTENCY NOTE: written the same defensive way as the rest of this
 * migration batch — checks current state via information_schema first, so
 * it's safe to re-run from any partial state.
 */
return new class extends Migration
{
    public function up(): void
    {
        if ($this->constraintExists('document_request', 'chk_dr_student_xor_alumni')) {
            DB::statement('ALTER TABLE document_request DROP CONSTRAINT chk_dr_student_xor_alumni');
        }
    }

    public function down(): void
    {
        if (!$this->constraintExists('document_request', 'chk_dr_student_xor_alumni')) {
            DB::statement(<<<SQL
                ALTER TABLE document_request
                ADD CONSTRAINT chk_dr_student_xor_alumni CHECK (
                    (student_profile_id IS NOT NULL AND alumni_profile_id IS NULL)
                    OR
                    (student_profile_id IS NULL AND alumni_profile_id IS NOT NULL)
                )
            SQL);
        }
    }

    /** True if the named constraint (FK, unique, or CHECK) exists on the given table. */
    private function constraintExists(string $table, string $constraint): bool
    {
        return DB::table('information_schema.table_constraints')
            ->whereRaw('table_schema = DATABASE()')
            ->where('table_name', $table)
            ->where('constraint_name', $constraint)
            ->exists();
    }
};
