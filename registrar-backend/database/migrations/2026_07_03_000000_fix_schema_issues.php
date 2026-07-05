<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

/**
 * Fixes for the issues found in the migration review:
 *
 *  Bugs
 *   - document_request: duplicate indexes on status_id and user_id
 *   - request_document.document_type_id: missing FK to document_type
 *   - request_certificate.certificate_type_id: missing FK to certificate_type
 *
 *  Design risks
 *   - document_request: no DB-level guarantee of the student/alumni XOR
 *   - announcements.created_by: no FK to users
 *   - users.updated_at: missing (Eloquent default timestamp behavior expects it)
 *   - users.idp_user_id: no unique constraint
 *
 *  Minor
 *   - request_document: redundant standalone request_id index; no unique
 *     constraint on (request_id, document_type_id)
 *   - users.email: varchar(100) -> varchar(191)
 *
 * NOT changed here (left for an app-level decision, not a schema fix):
 *   - admin_profile birthday/date_of_birth, gender/sex_at_birth duplication
 *   - request_history changed_by/processed_by duplication
 *
 * IDEMPOTENCY NOTE: MySQL's ALTER TABLE isn't transactional, so a migration
 * that fails partway through leaves its earlier statements committed even
 * though Laravel never records it as run. This happened twice while first
 * deploying this migration — confirmed via SHOW CREATE TABLE that the
 * document_request duplicate-index drops, the XOR check, fk_rd_document_type,
 * and the old standalone request_id index drop had all already landed before
 * a later statement in the same run failed. Every operation below now checks
 * current state first via information_schema, so this is safe to run from
 * any partial state, including a completely fresh one.
 *
 * Also found on document_request while inspecting live state: a
 * chk_dr_requester CHECK constraint that predates this migration and is
 * actually stricter than chk_dr_student_xor_alumni below (it also requires
 * the matching *_academic_id column). Not something this migration added or
 * touches — left in place; it makes chk_dr_student_xor_alumni logically
 * redundant but not conflicting.
 *
 * IMPORTANT — run these checks before deploying to a database with real data:
 *   1. SELECT idp_user_id, COUNT(*) FROM users WHERE idp_user_id IS NOT NULL
 *        GROUP BY idp_user_id HAVING COUNT(*) > 1;
 *   2. SELECT request_id, document_type_id, COUNT(*) FROM request_document
 *        GROUP BY request_id, document_type_id HAVING COUNT(*) > 1;
 *   3. SELECT COUNT(*) FROM document_request
 *        WHERE (student_profile_id IS NOT NULL AND alumni_profile_id IS NOT NULL)
 *           OR (student_profile_id IS NULL AND alumni_profile_id IS NULL);
 *   4. Orphaned request_document/request_certificate rows are deleted
 *      automatically below (confirmed dummy/test data on this DB). On a
 *      database with real historical records, replace that step with a
 *      backfill instead.
 *
 * This migration targets MySQL and uses raw MODIFY statements for column
 * type changes instead of Blueprint::change(), so it does not require
 * doctrine/dbal.
 */
return new class extends Migration
{
    public function up(): void
    {
        // --- document_request: drop duplicate indexes (if still present) ---
        if ($this->indexExists('document_request', 'status_id')) {
            Schema::table('document_request', fn (Blueprint $table) => $table->dropIndex('status_id'));
        }
        if ($this->indexExists('document_request', 'user_id')) {
            Schema::table('document_request', fn (Blueprint $table) => $table->dropIndex('user_id'));
        }

        // --- document_request: DB-level student/alumni XOR check (if missing)
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

        // --- request_document / request_certificate: delete orphaned rows --
        // Naturally idempotent — deletes 0 rows if already clean.
        DB::table('request_document as rd')
            ->leftJoin('document_type as dt', 'dt.document_type_id', '=', 'rd.document_type_id')
            ->whereNull('dt.document_type_id')
            ->delete();

        DB::table('request_certificate as rc')
            ->leftJoin('certificate_type as ct', 'ct.certificate_type_id', '=', 'rc.certificate_type_id')
            ->whereNull('ct.certificate_type_id')
            ->delete();

        // --- request_document: FK (if missing) ------------------------------
        if (!$this->constraintExists('request_document', 'fk_rd_document_type')) {
            Schema::table('request_document', function (Blueprint $table) {
                $table->foreign('document_type_id', 'fk_rd_document_type')
                    ->references('document_type_id')->on('document_type');
            });
        }

        // --- request_document: unique composite (if missing) ---------------
        // Order matters: request_id has an existing FK to document_request
        // (request_document_ibfk_1), and MySQL always requires a supporting
        // index on request_id. Create the new unique index FIRST — it covers
        // request_id as its leading column, so it can take over as that FK's
        // supporting index — THEN drop the old indexes it replaces.
        if (!$this->indexExists('request_document', 'rd_request_doctype_unique')) {
            Schema::table('request_document', function (Blueprint $table) {
                $table->unique(['request_id', 'document_type_id'], 'rd_request_doctype_unique');
            });
        }
        if ($this->indexExists('request_document', 'request_id')) {
            Schema::table('request_document', fn (Blueprint $table) => $table->dropIndex('request_id'));
        }
        if ($this->indexExists('request_document', 'rd_request_doctype_idx')) {
            Schema::table('request_document', fn (Blueprint $table) => $table->dropIndex('rd_request_doctype_idx'));
        }

        // --- request_certificate: missing FK (if missing) -------------------
        if (!$this->constraintExists('request_certificate', 'fk_rc_certificate_type')) {
            Schema::table('request_certificate', function (Blueprint $table) {
                $table->foreign('certificate_type_id', 'fk_rc_certificate_type')
                    ->references('certificate_type_id')->on('certificate_type');
            });
        }

        // --- users: widen email (MODIFY is naturally idempotent) ------------
        DB::statement('ALTER TABLE users MODIFY email VARCHAR(191) NOT NULL');

        // --- users: unique idp_user_id (if missing) -------------------------
        if (!$this->indexExists('users', 'uq_users_idp_user_id')) {
            Schema::table('users', function (Blueprint $table) {
                $table->unique('idp_user_id', 'uq_users_idp_user_id');
            });
        }

        // --- users: add updated_at (if missing) -----------------------------
        if (!Schema::hasColumn('users', 'updated_at')) {
            Schema::table('users', function (Blueprint $table) {
                $table->timestamp('updated_at')->nullable()
                    ->useCurrent()->useCurrentOnUpdate()
                    ->after('created_at');
            });
        }

        // --- announcements: align created_by's type with users.user_id -----
        // created_by is bigint unsigned, users.user_id is a signed int (the
        // "mixed PK types" inconsistency from the original review) — MySQL
        // refuses to create an FK across mismatched column types (error
        // 3780). Changing this column, not users.user_id itself: user_id is
        // referenced by FKs from most of the rest of the schema, so it's the
        // wrong side to touch. MODIFY is naturally idempotent.
        DB::statement('ALTER TABLE announcements MODIFY created_by INT NOT NULL');

        // --- announcements: index + FK on created_by (if missing) ----------
        if (!$this->indexExists('announcements', 'fk_announcements_created_by')) {
            Schema::table('announcements', function (Blueprint $table) {
                $table->index('created_by', 'fk_announcements_created_by');
            });
        }
        if (!$this->constraintExists('announcements', 'fk_announcements_created_by')) {
            Schema::table('announcements', function (Blueprint $table) {
                $table->foreign('created_by', 'fk_announcements_created_by')
                    ->references('user_id')->on('users')
                    ->onDelete('restrict');
            });
        }
    }

    public function down(): void
    {
        // NOTE: the orphaned request_document/request_certificate rows deleted
        // in up() are NOT restored here — a rollback can undo schema changes,
        // not recreate deleted data. If you need those rows back, restore from
        // a backup taken before this migration ran.

        if ($this->constraintExists('announcements', 'fk_announcements_created_by')) {
            Schema::table('announcements', fn (Blueprint $table) => $table->dropForeign('fk_announcements_created_by'));
        }
        if ($this->indexExists('announcements', 'fk_announcements_created_by')) {
            Schema::table('announcements', fn (Blueprint $table) => $table->dropIndex('fk_announcements_created_by'));
        }
        DB::statement('ALTER TABLE announcements MODIFY created_by BIGINT UNSIGNED NOT NULL');

        if (Schema::hasColumn('users', 'updated_at')) {
            Schema::table('users', fn (Blueprint $table) => $table->dropColumn('updated_at'));
        }
        if ($this->indexExists('users', 'uq_users_idp_user_id')) {
            Schema::table('users', fn (Blueprint $table) => $table->dropUnique('uq_users_idp_user_id'));
        }
        DB::statement('ALTER TABLE users MODIFY email VARCHAR(100) NOT NULL');

        if ($this->constraintExists('request_certificate', 'fk_rc_certificate_type')) {
            Schema::table('request_certificate', fn (Blueprint $table) => $table->dropForeign('fk_rc_certificate_type'));
        }

        // Recreate the old indexes BEFORE dropping the unique one — same
        // dependency-ordering reason as up(), in reverse.
        if (!$this->indexExists('request_document', 'rd_request_doctype_idx')) {
            Schema::table('request_document', function (Blueprint $table) {
                $table->index(['request_id', 'document_type_id'], 'rd_request_doctype_idx');
            });
        }
        if (!$this->indexExists('request_document', 'request_id')) {
            Schema::table('request_document', function (Blueprint $table) {
                $table->index('request_id', 'request_id');
            });
        }
        if ($this->indexExists('request_document', 'rd_request_doctype_unique')) {
            Schema::table('request_document', fn (Blueprint $table) => $table->dropUnique('rd_request_doctype_unique'));
        }
        if ($this->constraintExists('request_document', 'fk_rd_document_type')) {
            Schema::table('request_document', fn (Blueprint $table) => $table->dropForeign('fk_rd_document_type'));
        }

        if ($this->constraintExists('document_request', 'chk_dr_student_xor_alumni')) {
            DB::statement('ALTER TABLE document_request DROP CONSTRAINT chk_dr_student_xor_alumni');
        }

        if (!$this->indexExists('document_request', 'status_id')) {
            Schema::table('document_request', function (Blueprint $table) {
                $table->index('status_id', 'status_id');
            });
        }
        if (!$this->indexExists('document_request', 'user_id')) {
            Schema::table('document_request', function (Blueprint $table) {
                $table->index('user_id', 'user_id');
            });
        }
    }

    /** True if the named index/key exists on the given table in the current database. */
    private function indexExists(string $table, string $index): bool
    {
        return DB::table('information_schema.statistics')
            ->whereRaw('table_schema = DATABASE()')
            ->where('table_name', $table)
            ->where('index_name', $index)
            ->exists();
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