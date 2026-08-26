<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

/**
 * CashierDocumentPatternsSeeder
 *
 * Populates cashier_document_patterns on document_type and certificate_type.
 *
 * Patterns are the exact strings that appear in the `document` field of the
 * cashier API's items[] array. Matching is case-insensitive at runtime.
 * NULL = no cashier item cross-check for that type (OR existence + name
 * validation still runs as normal).
 *
 * Source of truth: Cashier System API PDF (as of June 5 2026) cross-referenced
 * against live DB rows confirmed via tinker on 2026-06-09.
 *
 * To update patterns after a cashier fee rename:
 *   1. Edit the array below (or update via the admin CRUD endpoint).
 *   2. Re-run: php artisan db:seed --class=CashierDocumentPatternsSeeder
 */
class CashierDocumentPatternsSeeder extends Seeder
{
    public function run(): void
    {
        $this->seedDocumentTypes();
        $this->seedCertificateTypes();
    }

    // -------------------------------------------------------------------------
    // Document types
    // -------------------------------------------------------------------------

    private function seedDocumentTypes(): void
    {
        // Keyed by document_type_id.
        // NULL = skip item matching (OR existence + name check only).
        $patterns = [

            // Replacement of Lost Identification Card
            // Confirmed 2026-08-25: not a Registrar item — Cashier's own doc
            // now lists this under Student Services. No cashier fee line to
            // cross-check against; skip item matching.
            2 => null,

            // Recommendation Letter — no cashier fee
            5 => null,

            // Student/Alumni Referral and Recommendation — no cashier fee
            6 => null,

            // Application for Graduation (SIS and Non-SIS)
            8 => [
                'Application for Graduation',
            ],

            // Course/Subject Description
            9 => [
                'Detailed Description of Subjects',
            ],

            // Correction of Entry of Grade / Completion / Late Reporting
            // — internal grade processing, no cashier fee
            10 => null,

            // Course Accreditation (SHS to Bridge) — no cashier equivalent
            11 => null,

            // Course Accreditation (Transferees)
            // Confirmed 2026-08-25: not a Registrar item per the final
            // matcher doc. Skip item matching.
            12 => null,

            // CERTIFICATION — generic bucket, certificate types handle matching
            13 => null,

            // CAV/APOSTILE
            14 => [
                'CAV (CHED)',
                'CAV (DFA) - undergraduate',
                'CAV (DFA) with Special Certification',
                'CAV/Apostille (DFA)',
            ],

            // Transcript of Records (TOR)
            // NOTE: per the final matcher doc, "Authentication Fee -
            // Transcript of Records" and "Authentication Fee - Transcript &
            // Diploma" are "Same with CTC (Duplicate)" — i.e. Certified True
            // Copy items, not TOR. Moved to certificate_type 7. "Scanned
            // Picture for Transcript" is flagged "Not in Registrar (Any
            // Certificate - Accessory)" — dropped entirely, not reassigned.
            15 => [
                'Transcript of Records',
                'Transcript of Records - Undergraduate (2 pages)',
                'Transcript of Records - Undergraduate (3 pages)',
                'Transcript of Records (1 page)',
                'Transcript of Records - Technology Courses',
                'Transcript of Records - 2nd copy (graduate-engineering)',
                'Transcript of Records - 2nd copy (non-engineering graduate)',
                'Transcript of Records (graduate-Engineering/Copy for)',
                'Transcript of Records (graduate-Non-Engineering/Copy for)',
                'Transcript of Records (OU)',
                'Transcript of Records - 2nd copy (graduate-non-engineering)',
            ],

            // Informative Copy of Grades
            // NOTE: "Certified True Copy - Informative Copy of Grades" is
            // NOT this type — per the final matcher doc it maps to the
            // registrar name "Certified True Copy of Records" (certificate_
            // type 7), a separate document. Do not add it back here.
            16 => [
                'Informative Copy of Grades',
                'Certification Fee - Informative Copy of Grades',
            ],

            // Request for Leave of Absences — no cashier fee
            17 => null,

            // Re-Admission
            18 => [
                'Re-admission Fee',
            ],
        ];

        foreach ($patterns as $id => $patternList) {
            DB::table('document_type')
                ->where('document_type_id', $id)
                ->update([
                    'cashier_document_patterns' => $patternList !== null
                        ? json_encode($patternList)
                        : null,
                ]);
        }
    }

    // -------------------------------------------------------------------------
    // Certificate types
    // -------------------------------------------------------------------------

    private function seedCertificateTypes(): void
    {
        // Keyed by certificate_type_id.
        // NULL = skip item matching (OR existence + name check only).
        $patterns = [

            // Certificate of GWA
            1 => [
                'General Weighted Average',
                'Certification Fee - General Weighted Average',
                'Certified True Copy - General Weighted Average',
            ],

            // Non Issuance of SO
            2 => [
                'Non-Issuance of S.O.',
                'Certification Fee - Non-Issuance of S.O.',
            ],

            // Certification of Medium of Instruction
            3 => [
                'English as Medium of Instruction',
                'Certification Fee - Medium of Instruction',
                'Certification Fee - English as Medium of Instruction',
            ],

            // Certification of Medium of Instruction with Units
            // Same cashier fees as ID 3 — different RIS variant, same payment.
            4 => [
                'English as Medium of Instruction',
                'Certification Fee - Medium of Instruction',
                'Certification Fee - English as Medium of Instruction',
            ],

            // Certificate of Attendance
            // Confirmed 2026-08-25: not a Registrar item per the final
            // matcher doc; its old pattern matches nothing there. Skip
            // item matching.
            5 => null,

            // Certificate of Graduation
            6 => [
                'Certificate of Graduation - 2nd copy',
                'Certification Fee - Certificate of Graduation',
            ],

            // Certified True Copy of Records
            // Distinct from Doc 16 (Informative Copy of Grades) — confirmed
            // 2026-08-25. Per the final matcher doc: "Certified True Copy -
            // Informative Copy of Grades" is the cashier label for THIS type
            // (registrar name = "Certified True Copy of Records"). The two
            // "Authentication Fee -" items are flagged "Same with CTC
            // (Duplicate)", i.e. also this type — moved here from doc 15.
            7 => [
                'Certified True Copy - Informative Copy of Grades',
                'Authentication Fee - Transcript of Records',
                'Authentication Fee - Transcript & Diploma',
            ],

            // Certificate of Graduate Honor — no cashier equivalent
            8 => null,

            // Consular Certification — no cashier equivalent
            9 => null,

            // Certificate of Enrollment - PRESENT
            // NOTE: previously matched against "Certificate of Registration"
            // cashier items. Confirmed 2026-08-25 that Certificate of
            // Registration (COR) and Certificate of Enrollment are two
            // different, separately-paid documents (COR is NOT free) — the
            // old assumption that they were the same was wrong and let
            // students submit Enrollment requests using a COR receipt.
            // Cashier has no distinct fee line for Certificate of Enrollment
            // yet (per the June 2026 matcher doc, it's still "Add in our
            // system"), so there's nothing correct to match against. Skip
            // item matching until Cashier creates that fee line — do NOT
            // reintroduce "Certificate of Registration" here.
            10 => null,

            // Certificate of Enrollment - UNDERGRAD — same situation as ID 10.
            11 => null,

            // Certificate of Ladderized Course — no cashier equivalent
            12 => null,

            // CAV Request Letter
            13 => [
                'CAV (CHED)',
                'CAV (DFA) - undergraduate',
                'CAV (DFA) with Special Certification',
                'CAV/Apostille (DFA)',
            ],

            // CAV — same pool as ID 13
            14 => [
                'CAV (CHED)',
                'CAV (DFA) - undergraduate',
                'CAV (DFA) with Special Certification',
                'CAV/Apostille (DFA)',
            ],

            // Certification of NSTP-CWTS
            // Only appears as a labelled cashier fee.
            15 => [
                'Certification Fee - NSTP-CWTS',
                'Certification Fee - Certification of NSTP-CWTS',
            ],

            // Endorsement Letter
            // Confirmed 2026-08-25: not a Registrar item — Cashier's own doc
            // now lists this under Head of Academic Program. Skip item
            // matching.
            16 => null,

            // Certificate of Eligibility to Transfer
            // "Honorable Dismissal" is the cashier's equivalent.
            17 => [
                'Honorable Dismissal',
                'Certification Fee - Honorable Dismissal',
                'Certification Fee - Certificate of Eligibility to Transfer',
            ],
        ];

        foreach ($patterns as $id => $patternList) {
            DB::table('certificate_type')
                ->where('certificate_type_id', $id)
                ->update([
                    'cashier_document_patterns' => $patternList !== null
                        ? json_encode($patternList)
                        : null,
                ]);
        }
    }
}