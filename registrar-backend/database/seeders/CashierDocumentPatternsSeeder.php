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
            // Cashier has both "Replacement of Lost ID" and "New ID -2nd copy"
            // as valid payment options for the same RIS type.
            2 => [
                'Replacement of ID',
                'Replacement of Lost ID',
                'New ID -2nd copy',
            ],

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
            12 => [
                'Accreditation Fee for transferees from another University (per unit)',
            ],

            // CERTIFICATION — generic bucket, certificate types handle matching
            13 => null,

            // CAV/APOSTILE
            14 => [
                'CAV (CHED)',
                'CAV (DFA) -undergraduate',
                'CAV (DFA) with Special Certification',
                'CAV/Apostille (DFA)',
            ],

            // Transcript of Records (TOR)
            // Covers all TOR variants and related authentication/scanning fees.
            15 => [
                'Transcript of Records',
                'Transcript of Records -Undergraduate (2 pages)',
                'Transcript of Records -Undergraduate (3 pages)',
                'Transcript of Records (1 page)',
                'Transcript of Records -Technology Courses',
                'Transcript of Records -2nd copy (graduate-engineering)',
                'Transcript of Records -2nd copy (non-engineering graduate)',
                'Transcript of Records (graduate-Engineering/Copy for)',
                'Transcript of Records (graduate-Non-Engineering/Copy for)',
                'Transcript of Records (OU)',
                'Transcript of Records-2nd copy (graduate-non-engineering)',
                'Authentication Fee -Transcript of Records',
                'Authentication Fee -Transcript & Diploma',
                'Scanned Picture for Transcript',
            ],

            // Informative Copy of Grades
            // Cashier admin may prefix with "Certification Fee -" or
            // "Certified True Copy -" depending on the transaction type.
            16 => [
                'Informative Copy of Grades',
                'Certification Fee - Informative Copy of Grades',
                'Certified True Copy - Informative Copy of Grades',
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
            // No standalone cashier item — only appears as a labelled fee.
            5 => [
                'Certification Fee - Certificate of Attendance',
            ],

            // Certificate of Graduation
            6 => [
                'Certificate of Graduation -2nd copy',
                'Certification Fee - Certificate of Graduation',
            ],

            // Certified True Copy of Records
            // "Certified True Copy -" is a label prefix in the cashier, always
            // applied to a specific document. Skipping item match — OR
            // existence + name check is sufficient.
            7 => null,

            // Certificate of Graduate Honor — no cashier equivalent
            8 => null,

            // Consular Certification — no cashier equivalent
            9 => null,

            // Certificate of Enrollment - PRESENT
            // "Certificate of Registration" is the cashier's name for
            // enrollment certificates.
            10 => [
                'Certificate of Registration',
                'Certification Fee - Certificate of Registration',
                'Certified True Copy - Certificate of Registration',
            ],

            // Certificate of Enrollment - UNDERGRAD
            // Same cashier fees as ID 10.
            11 => [
                'Certificate of Registration',
                'Certification Fee - Certificate of Registration',
                'Certified True Copy - Certificate of Registration',
            ],

            // Certificate of Ladderized Course — no cashier equivalent
            12 => null,

            // CAV Request Letter
            13 => [
                'CAV (CHED)',
                'CAV (DFA) -undergraduate',
                'CAV (DFA) with Special Certification',
                'CAV/Apostille (DFA)',
            ],

            // CAV — same pool as ID 13
            14 => [
                'CAV (CHED)',
                'CAV (DFA) -undergraduate',
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
            16 => [
                'Endorsement',
                'Certification Fee - Endorsement',
            ],

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
