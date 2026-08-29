<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
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
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('request_document', function (Blueprint $table) {
            if (!Schema::hasColumn('request_document', 'status_id')) {
                $table->integer('status_id')->nullable()->after('number_of_copies');
                $table->index('status_id', 'request_document_status_idx');
                $table->foreign('status_id', 'request_document_status_fk')
                    ->references('status_id')->on('request_status');
            }
        });

        Schema::table('request_certificate', function (Blueprint $table) {
            if (!Schema::hasColumn('request_certificate', 'status_id')) {
                $table->integer('status_id')->nullable()->after('number_of_copies');
                $table->index('status_id', 'request_certificate_status_idx');
                $table->foreign('status_id', 'request_certificate_status_fk')
                    ->references('status_id')->on('request_status');
            }
        });

        Schema::table('request_history', function (Blueprint $table) {
            // Nullable — a NULL value means "this history row is about the
            // request as a whole" (every existing row, and every future
            // whole-request bulk transition). A non-null value means "this
            // row is about one specific line item" (new granular
            // per-item transitions going forward). Exactly one of the two
            // FKs is ever set on a given row, never both — enforced at the
            // application layer (RequestItemStatusService), not the DB,
            // same pattern already used for document_request's own
            // student_profile_id/alumni_profile_id "exactly one of these"
            // pairing elsewhere in this schema.
            if (!Schema::hasColumn('request_history', 'request_document_id')) {
                $table->integer('request_document_id')->nullable()->after('request_id');
                $table->index('request_document_id', 'request_history_document_idx');
                $table->foreign('request_document_id', 'request_history_document_fk')
                    ->references('request_document_id')->on('request_document')
                    ->onDelete('set null');
            }

            if (!Schema::hasColumn('request_history', 'request_certificate_id')) {
                $table->integer('request_certificate_id')->nullable()->after('request_document_id');
                $table->index('request_certificate_id', 'request_history_certificate_idx');
                $table->foreign('request_certificate_id', 'request_history_certificate_fk')
                    ->references('request_certificate_id')->on('request_certificate')
                    ->onDelete('set null');
            }
        });

        // Backfill: every existing line item inherits its parent request's
        // CURRENT status_id, so nothing regresses for in-flight requests.
        // Correlated-subquery form — portable across MySQL/MariaDB,
        // PostgreSQL, and SQLite (unlike the MySQL-only multi-table
        // UPDATE...JOIN...SET syntax this replaces).
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
        Schema::table('request_history', function (Blueprint $table) {
            if (Schema::hasColumn('request_history', 'request_certificate_id')) {
                $table->dropForeign('request_history_certificate_fk');
                $table->dropIndex('request_history_certificate_idx');
                $table->dropColumn('request_certificate_id');
            }
            if (Schema::hasColumn('request_history', 'request_document_id')) {
                $table->dropForeign('request_history_document_fk');
                $table->dropIndex('request_history_document_idx');
                $table->dropColumn('request_document_id');
            }
        });

        Schema::table('request_certificate', function (Blueprint $table) {
            if (Schema::hasColumn('request_certificate', 'status_id')) {
                $table->dropForeign('request_certificate_status_fk');
                $table->dropIndex('request_certificate_status_idx');
                $table->dropColumn('status_id');
            }
        });

        Schema::table('request_document', function (Blueprint $table) {
            if (Schema::hasColumn('request_document', 'status_id')) {
                $table->dropForeign('request_document_status_fk');
                $table->dropIndex('request_document_status_idx');
                $table->dropColumn('status_id');
            }
        });
    }
};
