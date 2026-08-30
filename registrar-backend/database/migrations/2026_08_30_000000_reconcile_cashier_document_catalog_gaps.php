<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * Reconciles a batch of Cashier document-catalog gaps found while
 * investigating why OR #1000084 left "Certified True Copy - Certificate of
 * Registration" and "Diploma" unmatched on the student-facing request
 * screen. Cross-referenced against two confirmed Cashier reference PDFs
 * ("Registrar_Cashier_Documents") and a real Cashier receipt (OR #1000084,
 * PUPTeC Testing, viewed 2026-08-30) to identify the exact real Cashier
 * label strings rather than guessing.
 *
 * IMPORTANT — this is a forward fix, not staging-specific cleanup:
 * the pattern bugs below (CAV, Medium of Instruction, Certification of
 * Graduation, NSTP-CWTS) are baked into DatabaseSeeder.php itself, so
 * every fresh install (local dev, CI, and — until this migration exists —
 * production) ships with the same wrong/ambiguous patterns. This migration
 * corrects them going forward without touching DatabaseSeeder.php, per team
 * convention of not editing already-shipped seed data in place.
 *
 * NOT included here: the three document_type ID collisions (21/23/24)
 * caused by ad-hoc test rows created via the Add Document screen before
 * 2026_08_29_000002 ran. That was a one-time staging-only data anomaly
 * (auto-increment landing on IDs the seeder/migration also hardcoded) and
 * does not occur on a fresh install, so there is nothing to reconcile here
 * for that part.
 *
 * WHAT THIS MIGRATION DOES:
 *
 *   1. Fixes 4 wrong or duplicate Cashier patterns:
 *      - document_type 14 (CAV/APOSTILE): was missing the real "with
 *        Special Certification" label ("CAV/Apostille (DFA) with Special
 *        Certification") and carried two stale non-"/Apostille" duplicates
 *        ("CAV (DFA) - undergraduate", "CAV (DFA) with Special
 *        Certification") that also collided with certificate_type 13/14.
 *      - certificate_type 13 ("CAV Request Letter") and 14 ("CAV"): had the
 *        exact same 4 patterns as document_type 14, making resolution
 *        ambiguous. Since the PDF types all 4 CAV/Apostille items as
 *        Document, not Certificate, document_type 14 is kept as the sole
 *        matcher; these two are nulled out (rows themselves are left in
 *        place, unlike the certificate_type_id=7 case, since nothing here
 *        indicates they're otherwise unused).
 *      - certificate_type 4 ("...with Units"): had the exact same patterns
 *        as certificate_type 3, and no PDF confirms a distinct "with
 *        Units" Cashier item exists. Nulled out; certificate_type 3 is the
 *        sole matcher.
 *      - certificate_type 6 (Certificate of Graduation): pattern said
 *        "Certification Fee - Certificate of Graduation"; PDF confirms the
 *        real label is "Certification Fee - Certification of Graduation".
 *      - certificate_type 15 (NSTP-CWTS): stored patterns never matched
 *        anything real; PDF confirms the actual Cashier label is
 *        "NSTP Serial No.".
 *
 *   2. Creates document_type/certificate_type rows for 14 previously
 *      unmodeled Cashier items (see addMissingCatalogEntries()), including
 *      plain "Diploma" — confirmed as a real ₱150 requestable item (not
 *      auto-issued at graduation) via OR #1000084 and the RIS FAQ, which
 *      explicitly lists Diploma alongside TOR as something alumni request
 *      through this system.
 *
 *   3. Reconciles "Non-Issuance of Special Order": the PDF types it as
 *      Document, but it's seeded as certificate_type_id=2. Moves it to a
 *      new document_type row and migrates any existing request_certificate
 *      rows to request_document (preserving status_id), the same pattern
 *      used by 2026_08_29_000001_z_reassign_legacy_certificate_type_7_...
 *      for the analogous certificate_type_id=7 problem. On a fresh
 *      install this affects 0 rows (no data yet) but still relocates the
 *      catalog entry so newly-created requests use the correct table.
 *
 * Idempotent / safe to re-run: every step guards on current state
 * (existing name/pattern match before updating; firstOrCreate-by-name
 * before inserting; existence checks before moving/deleting), so running
 * this on an environment that's already been hand-patched via tinker
 * (e.g. staging, 2026-08-30) is a safe no-op for whichever parts already
 * match, and only applies what's still missing.
 */
return new class extends Migration
{
    public function up(): void
    {
        DB::transaction(function () {
            $this->fixAmbiguousAndWrongPatterns();
            $this->addMissingCatalogEntries();
            $this->reconcileNonIssuanceOfSpecialOrder();
        });
    }

    public function down(): void
    {
        // Deliberately not reversed. Steps 2 and 3 create/move real rows
        // that may already have live requests attached to them by the
        // time anyone rolls back (same reasoning as
        // 2026_08_29_000001_z_reassign_legacy_certificate_type_7_...).
        // Step 1's pattern corrections are also left in place on rollback
        // rather than restored to known-wrong values.
    }

    // -------------------------------------------------------------------
    // Step 1 — pattern fixes
    // -------------------------------------------------------------------

    private function fixAmbiguousAndWrongPatterns(): void
    {
        // document_type 14 (CAV/APOSTILE) — add the missing "/Apostille
        // with Special Certification" label, drop stale non-"/Apostille"
        // duplicates.
        $dt14 = DB::table('document_type')->where('document_type_id', 14)->first();
        if ($dt14 && $dt14->document_name === 'CAV/APOSTILE') {
            $current = json_decode((string) $dt14->cashier_document_patterns, true) ?: [];
            $correct = [
                'CAV (CHED)',
                'CAV/Apostille (DFA)',
                'CAV/Apostille (DFA) -undergraduate',
                'CAV/Apostille (DFA) with Special Certification',
            ];
            if ($current !== $correct) {
                DB::table('document_type')->where('document_type_id', 14)
                    ->update(['cashier_document_patterns' => json_encode($correct)]);
            }
        }

        // certificate_type 13/14 — null out patterns duplicated from
        // document_type 14, to leave one unambiguous matcher.
        foreach ([13 => 'CAV Request Letter', 14 => 'CAV'] as $id => $name) {
            $row = DB::table('certificate_type')->where('certificate_type_id', $id)->first();
            if ($row && $row->certificate_name === $name && $row->cashier_document_patterns !== null) {
                DB::table('certificate_type')->where('certificate_type_id', $id)
                    ->update(['cashier_document_patterns' => null]);
            }
        }

        // certificate_type 4 ("...with Units") — null out pattern
        // duplicated from certificate_type 3.
        $ct4 = DB::table('certificate_type')->where('certificate_type_id', 4)->first();
        if ($ct4 && $ct4->cashier_document_patterns !== null) {
            $ct3Patterns = json_decode(
                (string) DB::table('certificate_type')->where('certificate_type_id', 3)->value('cashier_document_patterns'),
                true
            ) ?: [];
            $ct4Patterns = json_decode((string) $ct4->cashier_document_patterns, true) ?: [];
            if ($ct3Patterns && $ct3Patterns === $ct4Patterns) {
                DB::table('certificate_type')->where('certificate_type_id', 4)
                    ->update(['cashier_document_patterns' => null]);
            }
        }

        // certificate_type 6 — "Certificate" -> "Certification" typo fix.
        $ct6 = DB::table('certificate_type')->where('certificate_type_id', 6)->first();
        if ($ct6) {
            $current = json_decode((string) $ct6->cashier_document_patterns, true) ?: [];
            if (in_array('Certification Fee - Certificate of Graduation', $current, true)) {
                $fixed = array_values(array_diff($current, ['Certification Fee - Certificate of Graduation']));
                $fixed[] = 'Certification Fee - Certification of Graduation';
                DB::table('certificate_type')->where('certificate_type_id', 6)
                    ->update(['cashier_document_patterns' => json_encode($fixed)]);
            }
        }

        // certificate_type 15 (NSTP-CWTS) — real label is "NSTP Serial No.".
        $ct15 = DB::table('certificate_type')->where('certificate_type_id', 15)->first();
        if ($ct15) {
            $current = json_decode((string) $ct15->cashier_document_patterns, true) ?: [];
            if ($current !== ['NSTP Serial No.']) {
                DB::table('certificate_type')->where('certificate_type_id', 15)
                    ->update(['cashier_document_patterns' => json_encode(['NSTP Serial No.'])]);
            }
        }
    }

    // -------------------------------------------------------------------
    // Step 2 — previously-missing catalog entries
    // -------------------------------------------------------------------

    private function addMissingCatalogEntries(): void
    {
        // access_id: 1 = Student, 2 = Alumni, 3 = Both (App\Enums\AccessType).
        $documentTypes = [
            [
                'document_name' => "Correction of Students' Profile in the SIS",
                'access_id' => 1,
                'patterns' => ["Correction of Students' Profile in the SIS"],
            ],
            [
                'document_name' => 'Cross-Enrollment',
                'access_id' => 1,
                'patterns' => ['Cross-Enrollment Fee'],
            ],
            [
                'document_name' => 'Replacement of Lost Registration Certificate',
                'access_id' => 1,
                'patterns' => ['Replacement of Lost Registration Certificate'],
            ],
            [
                'document_name' => 'Student Verification',
                'access_id' => 2,
                'patterns' => ['Student Verification Fee', 'Student Verification Fee (10usd@58.12)'],
            ],
            [
                'document_name' => 'Diploma - 2nd Copy',
                'access_id' => 2,
                'patterns' => ['Diploma -2nd copy'],
            ],
            [
                'document_name' => 'Diploma',
                'access_id' => 2,
                'patterns' => ['Diploma'],
                // Confirmed via OR #1000084 (Cashier receipt, PUPTeC Testing,
                // 2026-08-30): Fee Name "Diploma", Label "None", P150.00.
                // Confirmed requestable (not auto-issued) via RIS FAQ, which
                // lists Diploma alongside TOR as an alumni-requestable item.
            ],
            [
                'document_name' => 'Certified True Copy - Certificate of Candidacy',
                'access_id' => 3,
                'patterns' => ['Certified True Copy - Certificate of Candidacy'],
                'requirements' => 'TODO (admin): confirm exact requirements for this certified-copy variant.',
                'logbook_category_name' => 'Certified True Copy of Records',
                'requires_source_submission' => true,
            ],
            [
                'document_name' => 'Accreditation Fee for Transferees from Another University (per unit)',
                'access_id' => 1,
                'patterns' => ['Accreditation Fee for transferees from another University (per unit)'],
            ],
            [
                'document_name' => 'Admission Fee for Transfer Students (from Private)',
                'access_id' => 1,
                'patterns' => ['Admission Fee for Transfer Students (from private)'],
            ],
            [
                'document_name' => 'Admission Fee for Transfer Students (from SUCs)',
                'access_id' => 1,
                'patterns' => ['Admission Fee for Transfer Students (from SUCs)'],
            ],
        ];

        foreach ($documentTypes as $dt) {
            if (DB::table('document_type')->where('document_name', $dt['document_name'])->exists()) {
                continue; // idempotent re-run
            }

            $logbookId = null;
            if (!empty($dt['logbook_category_name'])) {
                $logbookId = DB::table('logbook_category')
                    ->where('name', $dt['logbook_category_name'])
                    ->value('logbook_category_id');
            }

            DB::table('document_type')->insert([
                'document_name' => $dt['document_name'],
                'document_description' => '',
                'document_requirements' => $dt['requirements'] ?? 'Pending admin configuration - set via Document Management',
                'document_process_period' => 'Pending admin configuration - set via Document Management',
                'access_id' => $dt['access_id'],
                'cashier_document_patterns' => json_encode($dt['patterns']),
                'logbook_category_id' => $logbookId,
                'requires_source_submission' => $dt['requires_source_submission'] ?? false,
            ]);
        }

        $certificateTypes = [
            [
                'certificate_name' => 'Certification of Subjects Taken (Practicum Subject)',
                'access_id' => 2,
                'patterns' => ['Certification Fee - Subjects Taken (Practicum Subject)'],
            ],
            [
                'certificate_name' => 'Certification of Subjects Taken (Stenography Subjects)',
                'access_id' => 2,
                'patterns' => ['Certification Fee - Subjects Taken (stenography subjects)'],
            ],
            [
                'certificate_name' => 'Certification of Curriculum Evaluation',
                'access_id' => 3,
                'patterns' => ['Certification Fee - Curriculum Evaluation'],
            ],
            [
                'certificate_name' => 'Certification of Latin Honors',
                'access_id' => 2,
                'patterns' => ['Certification Fee - Latin Honors'],
            ],
        ];

        foreach ($certificateTypes as $ct) {
            if (DB::table('certificate_type')->where('certificate_name', $ct['certificate_name'])->exists()) {
                continue; // idempotent re-run
            }

            DB::table('certificate_type')->insert([
                'certificate_name' => $ct['certificate_name'],
                'certificate_requirements' => 'Pending admin configuration - set via Document Management',
                'certificate_process_period' => 'Pending admin configuration - set via Document Management',
                'access_id' => $ct['access_id'],
                'cashier_document_patterns' => json_encode($ct['patterns']),
                'layout_footer_urls' => json_encode([]),
                'requires_source_submission' => false,
            ]);
        }
    }

    // -------------------------------------------------------------------
    // Step 3 — Non-Issuance of Special Order: certificate_type -> document_type
    // -------------------------------------------------------------------

    private function reconcileNonIssuanceOfSpecialOrder(): void
    {
        $existing = DB::table('certificate_type')->where('certificate_type_id', 2)->first();
        if (!$existing) {
            return; // already reconciled on this environment
        }

        $newDocTypeName = 'Non-Issuance of Special Order';
        $newDocTypeId = DB::table('document_type')->where('document_name', $newDocTypeName)->value('document_type_id');

        if (!$newDocTypeId) {
            $newDocTypeId = DB::table('document_type')->insertGetId([
                'document_name' => $newDocTypeName,
                'document_description' => '',
                'document_requirements' => 'Pending admin configuration - set via Document Management',
                'document_process_period' => 'Pending admin configuration - set via Document Management',
                'access_id' => 3, // Both, per confirmed PDF stakeholder column.
                'cashier_document_patterns' => json_encode(['Non-Issuance of S.O.']),
                'requires_source_submission' => false,
            ]);
        }

        $affected = DB::table('request_certificate')->where('certificate_type_id', 2)->get();

        foreach ($affected as $row) {
            DB::table('request_document')->insert([
                'request_id' => $row->request_id,
                'document_type_id' => $newDocTypeId,
                'number_of_copies' => max(1, min(10, (int) $row->number_of_copies)),
                'status_id' => $row->status_id ?? null,
            ]);
        }

        if ($affected->isNotEmpty()) {
            DB::table('request_certificate')->where('certificate_type_id', 2)->delete();
            $ids = $affected->pluck('request_id')->unique()->implode(', ');
            echo "  Reassigned {$affected->count()} Non-Issuance of Special Order request_certificate row(s) "
                . "(request_id: {$ids}) to document_type_id={$newDocTypeId}.\n";
        }

        DB::table('certificate_type')->where('certificate_type_id', 2)->delete();
    }
};
