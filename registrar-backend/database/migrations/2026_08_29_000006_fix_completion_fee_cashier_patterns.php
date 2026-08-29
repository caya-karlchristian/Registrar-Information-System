<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * Corrective follow-up to 2026_08_29_000002_reconcile_ctc_and_completion_fee_document_types.
 *
 * That migration guessed at Cashier patterns for the Completion Fee split
 * from a garbled PDF table extraction. We now have the real, confirmed
 * Cashier System item list (Cashier_System_API.pdf — "List of all Documents
 * from Cashier System as of June 5, 2026") and it corrects two things:
 *
 *   1. document_type_id 10 ("Correction of Entry of Grade") — the original
 *      migration gave it two patterns, ['Correction of Entry of Grade',
 *      'Completion Fee (correction of entry)']. Only the second string is
 *      an actual Cashier item; the first was never a real Cashier label.
 *      Corrected to just ['Completion Fee (correction of entry)'].
 *
 *   2. document_type_id 20 ("Late Reporting of Grade") — the original
 *      migration invented the pattern 'Late Reporting of Grade'. That
 *      string does not appear anywhere in the official Cashier item list;
 *      it only ever showed up inside a combined LOGBOOK display label in
 *      an earlier source document, never as its own payable line item.
 *      Per team decision, this is corrected to null (no guessed pattern)
 *      rather than left wrong.
 *
 *      Known effect of null here (flagged, not silently accepted): both
 *      CashierDocumentMatcher (final-submit gate) and
 *      CashierDocumentSuggester (intake pre-fill) treat a null pattern as
 *      "not a Cashier-matchable item" — same treatment as non-Registrar
 *      items like Tuition/Water. Concretely: CashierDocumentMatcher will
 *      skip payment verification entirely for this item if it's ever
 *      selected on a request, until a real pattern is added. This is an
 *      accepted interim gap (low-volume, staff-mediated item), not an
 *      oversight — replace null with the real confirmed string via the
 *      Document Management screen (a data edit, no migration needed)
 *      once Cashier confirms it.
 *
 * document_type_id 19 ("Completion of Incomplete Grade") is untouched —
 * its pattern ('Completion Fee') was already correct against the real list.
 *
 * Idempotent / safe to re-run: only touches rows if they still hold the
 * old guessed values, so running this whether or not 000002 already ran
 * (or already ran with a hand-patched value) won't clobber anything.
 */
return new class extends Migration
{
    public function up(): void
    {
        DB::transaction(function () {
            // document_type_id 10 — Correction of Entry of Grade.
            $row10 = DB::table('document_type')->where('document_type_id', 10)->first();
            if ($row10 && $row10->document_name === 'Correction of Entry of Grade') {
                $patterns = json_decode((string) $row10->cashier_document_patterns, true) ?: [];
                if (in_array('Correction of Entry of Grade', $patterns, true)) {
                    DB::table('document_type')
                        ->where('document_type_id', 10)
                        ->update([
                            'cashier_document_patterns' => json_encode([
                                'Completion Fee (correction of entry)',
                            ]),
                        ]);
                }
            }

            // document_type_id 20 — Late Reporting of Grade.
            $row20 = DB::table('document_type')->where('document_type_id', 20)->first();
            if ($row20 && $row20->document_name === 'Late Reporting of Grade') {
                $patterns = json_decode((string) $row20->cashier_document_patterns, true) ?: [];
                if (in_array('Late Reporting of Grade', $patterns, true)) {
                    DB::table('document_type')
                        ->where('document_type_id', 20)
                        ->update([
                            'cashier_document_patterns' => null,
                        ]);
                }
            }
        });
    }

    public function down(): void
    {
        DB::transaction(function () {
            $row10 = DB::table('document_type')->where('document_type_id', 10)->first();
            if ($row10 && $row10->document_name === 'Correction of Entry of Grade') {
                DB::table('document_type')
                    ->where('document_type_id', 10)
                    ->update([
                        'cashier_document_patterns' => json_encode([
                            'Correction of Entry of Grade',
                            'Completion Fee (correction of entry)',
                        ]),
                    ]);
            }

            $row20 = DB::table('document_type')->where('document_type_id', 20)->first();
            if ($row20 && $row20->document_name === 'Late Reporting of Grade') {
                DB::table('document_type')
                    ->where('document_type_id', 20)
                    ->update([
                        'cashier_document_patterns' => json_encode(['Late Reporting of Grade']),
                    ]);
            }
        });
    }
};
