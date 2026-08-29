<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * Unblocks 2026_08_29_000002_reconcile_ctc_and_completion_fee_document_types
 * on any environment that has real, already-submitted requests pointing at
 * certificate_type_id = 7 ("Certified True Copy of Records").
 *
 * WHY THIS EXISTS (staging deploy failure, 2026-08-29):
 *   Migration 000002 refuses to delete certificate_type_id 7 while any
 *   request_certificate row still references it — by design, to avoid
 *   silently orphaning historical request data. Staging has 8 such rows.
 *   This migration resolves that block the same way the rest of this
 *   reconciliation handles anything it can't confidently auto-resolve:
 *   it does NOT guess which of the 9 new CTC document_type rows each
 *   legacy request was actually for (that distinction was never captured
 *   historically — certificate_type_id=7 bundled multiple source
 *   documents under one type with no column recording which one a given
 *   request matched, which is the exact gap this whole project exists to
 *   close going forward). Guessing wrong would silently misfile a real
 *   student's request. Instead, each legacy row is moved to one explicit,
 *   clearly-labeled "needs manual reconciliation" document_type row,
 *   where staff can look up the actual request (by request_id/OR number)
 *   and confirm/relabel it via the existing Document Management screens —
 *   the same "don't guess, surface for manual resolution" precedent
 *   already used elsewhere in this project (UnmatchedCashierItem).
 *
 * WHY THE NAME/TIMESTAMP LOOKS UNUSUAL:
 *   This must run AFTER 2026_08_29_000001_add_logbook_and_submission_...
 *   (it depends on document_type.logbook_category_id/
 *   requires_source_submission existing, and on the logbook_category
 *   table) but BEFORE 2026_08_29_000002_reconcile_... (whose delete guard
 *   it satisfies). Per team convention, already-applied migrations are
 *   never edited — corrections ship as new files. Migration run order is
 *   plain filename string sort, so "..._000001_z_..." is chosen to sort
 *   strictly between "..._000001_add_logbook..." and "..._000002_...":
 *   this holds on staging (where 000000/000001 already executed and
 *   won't re-run regardless of this file's position) AND on a completely
 *   fresh install/CI run (where all migrations execute in one pass and
 *   ordering relative to 000001 genuinely matters).
 *
 * WHAT IT DOES:
 *   1. Creates (or reuses) the "Certified True Copy of Records" logbook
 *      category — using firstOrCreate-by-name, so when 000002 runs right
 *      after this and looks up the same name, it finds this row instead
 *      of creating a duplicate.
 *   2. Creates one fallback document_type row, id 40 (next free id after
 *      the 9 CTC rows [21-29] and 10 TOR rows [30-39] this reconciliation
 *      batch already reserves), flagged in both its name and its
 *      requirements text as needing manual reconciliation.
 *   3. Copies each affected request_certificate row into request_document
 *      (carrying request_id and number_of_copies — clamped to
 *      request_document's 1-10 CHECK constraint, which request_certificate
 *      was never given), then deletes the original request_certificate
 *      rows. request_history rows pointing at those deleted rows are
 *      safely nulled out by the ON DELETE SET NULL foreign key added in
 *      2026_08_29_000007 (which runs later) — the request-level audit
 *      trail, keyed by request_id, is unaffected.
 *
 *      IMPORTANT: this runs BEFORE 2026_08_29_000007/000008, so
 *      request_document does not yet have status_id or
 *      request_release_group_id columns at this point — this migration
 *      does not set them. 000007's own backfill step (which sets
 *      status_id from the parent document_request for any row where it's
 *      still NULL) picks up these newly-inserted rows exactly the same
 *      way it picks up every other pre-existing row, so nothing is lost —
 *      just populated slightly later in the migration sequence than rows
 *      that predate this one.
 *   4. Idempotent: safe to re-run. If certificate_type_id 7 is already
 *      gone, or no rows reference it, this is a no-op.
 *
 * FOLLOW-UP REQUIRED (flagged, not silently handled further): after this
 * deploys, staff should pull every request_document row with
 * document_type_id = 40 (query below) and, for each, confirm against the
 * original request/OR which specific source document it actually
 * certifies, then edit that row via Document Management to point it at
 * the correct one of the 9 real CTC document_type rows:
 *
 *   SELECT rd.request_document_id, rd.request_id, dr.or_number, dr.receipt_date
 *   FROM request_document rd
 *   JOIN document_request dr ON dr.request_id = rd.request_id
 *   WHERE rd.document_type_id = 40;
 */
return new class extends Migration
{
    private const CTC_LOGBOOK_NAME = 'Certified True Copy of Records';
    private const FALLBACK_DOCUMENT_TYPE_ID = 40;
    private const FALLBACK_NAME = 'Certified True Copy of Records (LEGACY - Needs Manual Reconciliation)';
    private const FALLBACK_REQUIREMENTS = 'LEGACY REQUEST migrated from the removed certificate_type_id=7 during the '
        . 'CTC/document_type reconciliation. The specific source document this certifies was not recorded on the '
        . 'original request. Staff: confirm the correct source document against the original request/OR (see the '
        . 'migration file docblock for the lookup query), then edit this line item via Document Management to point '
        . 'it at the correct CTC document type before processing.';
    private const FALLBACK_PROCESS_PERIOD = 'Pending manual reconciliation - see document_requirements';

    public function up(): void
    {
        DB::transaction(function () {
            if (!DB::table('certificate_type')->where('certificate_type_id', 7)->exists()) {
                return; // Already removed on this environment — nothing to reconcile.
            }

            $affected = DB::table('request_certificate')
                ->where('certificate_type_id', 7)
                ->get();

            if ($affected->isEmpty()) {
                return; // Nothing blocking 000002 here.
            }

            $logbookId = $this->firstOrCreateLogbookCategory(self::CTC_LOGBOOK_NAME);
            $this->ensureFallbackDocumentTypeExists($logbookId);

            foreach ($affected as $row) {
                // Only request_id/document_type_id/number_of_copies exist on
                // request_document at this point in the migration sequence —
                // see the class docblock's IMPORTANT note above.
                DB::table('request_document')->insert([
                    'request_id' => $row->request_id,
                    'document_type_id' => self::FALLBACK_DOCUMENT_TYPE_ID,
                    'number_of_copies' => max(1, min(10, (int) $row->number_of_copies)),
                ]);
            }

            DB::table('request_certificate')->where('certificate_type_id', 7)->delete();

            $ids = $affected->pluck('request_id')->unique()->implode(', ');
            echo "  Reassigned {$affected->count()} legacy CTC request_certificate row(s) "
                . "(request_id: {$ids}) to fallback document_type_id=".self::FALLBACK_DOCUMENT_TYPE_ID
                . " for manual staff reconciliation.\n";
        });
    }

    public function down(): void
    {
        // Deliberately not reversed: reconstructing the exact original
        // request_certificate rows (including which of the 8 pointed at
        // which now-decided document) can't be done safely once staff may
        // have already reassigned some of them via Document Management.
        // Rolling back 000002 already restores certificate_type_id=7 and
        // the CTC document rows; the fallback row and any request_document
        // rows created here are left in place rather than risking data loss.
    }

    private function firstOrCreateLogbookCategory(string $name): int
    {
        $existing = DB::table('logbook_category')->where('name', $name)->value('logbook_category_id');
        if ($existing) {
            return $existing;
        }

        return DB::table('logbook_category')->insertGetId([
            'name' => $name,
            'created_at' => now(),
            'updated_at' => now(),
        ], 'logbook_category_id');
    }

    private function ensureFallbackDocumentTypeExists(int $logbookId): void
    {
        if (DB::table('document_type')->where('document_type_id', self::FALLBACK_DOCUMENT_TYPE_ID)->exists()) {
            return; // idempotent re-run
        }

        DB::table('document_type')->insert([
            'document_type_id' => self::FALLBACK_DOCUMENT_TYPE_ID,
            'document_name' => self::FALLBACK_NAME,
            'document_description' => '',
            'document_requirements' => self::FALLBACK_REQUIREMENTS,
            'document_process_period' => self::FALLBACK_PROCESS_PERIOD,
            'access_id' => 3, // Both — unknown until manually reconciled.
            'cashier_document_patterns' => json_encode([]), // Never auto-matches new requests.
            'logbook_category_id' => $logbookId,
            'requires_source_submission' => true,
        ]);
    }
};
