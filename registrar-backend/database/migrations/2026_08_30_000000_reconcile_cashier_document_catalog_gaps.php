<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * Reconciles Cashier document-catalog gaps strictly against the Master Catalog[cite: 13].
 *
 * 1. Corrects wrong or ambiguous Cashier patterns (CAV, Medium of Instruction, NSTP-CWTS)[cite: 13].
 * 2. Creates document_type/certificate_type rows strictly for missing entries that exist in the Master Catalog[cite: 13].
 * 3. EXCLUDES bare "Diploma" to strictly honor Master Catalog boundaries (only Diploma variants exist).
 * 4. Reconciles "Non-Issuance of Special Order" from certificate_type to document_type[cite: 13].
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
        // Rollback intentionally left empty to preserve relational integrity for live requests.
    }

    private function fixAmbiguousAndWrongPatterns(): void
    {
        $dt14 = DB::table('document_type')->where('document_type_id', 14)->first();
        $dt14KnownNames = ['CAV/APOSTILE', 'CAV/Apostille (DFA)'];
        if ($dt14 && in_array($dt14->document_name, $dt14KnownNames, true)) {
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

        foreach ([13 => 'CAV Request Letter', 14 => 'CAV'] as $id => $name) {
            $row = DB::table('certificate_type')->where('certificate_type_id', $id)->first();
            if ($row && $row->certificate_name === $name && $row->cashier_document_patterns !== null) {
                DB::table('certificate_type')->where('certificate_type_id', $id)
                    ->update(['cashier_document_patterns' => null]);
            }
        }

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

        $ct15 = DB::table('certificate_type')->where('certificate_type_id', 15)->first();
        if ($ct15) {
            $current = json_decode((string) $ct15->cashier_document_patterns, true) ?: [];
            if ($current !== ['NSTP Serial No.']) {
                DB::table('certificate_type')->where('certificate_type_id', 15)
                    ->update(['cashier_document_patterns' => json_encode(['NSTP Serial No.'])]);
            }
        }
    }

    private function addMissingCatalogEntries(): void
    {
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
            // NOTE: Bare "Diploma" deliberately omitted to strictly follow Master Catalog.
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
                continue;
            }

            $patternCollision = false;
            foreach ($dt['patterns'] as $pattern) {
                if (DB::table('document_type')->where('cashier_document_patterns', 'like', '%"' . $pattern . '"%')->exists()) {
                    $patternCollision = true;
                    break;
                }
            }
            if ($patternCollision) {
                continue;
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
                continue;
            }

            $patternCollision = false;
            foreach ($ct['patterns'] as $pattern) {
                if (DB::table('certificate_type')->where('cashier_document_patterns', 'like', '%"' . $pattern . '"%')->exists()) {
                    $patternCollision = true;
                    break;
                }
            }
            if ($patternCollision) {
                continue;
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

    private function reconcileNonIssuanceOfSpecialOrder(): void
    {
        $existing = DB::table('certificate_type')->where('certificate_type_id', 2)->first();
        if (!$existing) {
            return;
        }

        $newDocTypeName = 'Non-Issuance of Special Order';
        $newDocTypeId = DB::table('document_type')->where('document_name', $newDocTypeName)->value('document_type_id');

        if (!$newDocTypeId) {
            $newDocTypeId = DB::table('document_type')->insertGetId([
                'document_name' => $newDocTypeName,
                'document_description' => '',
                'document_requirements' => 'Pending admin configuration - set via Document Management',
                'document_process_period' => 'Pending admin configuration - set via Document Management',
                'access_id' => 3,
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
        }

        DB::table('certificate_type')->where('certificate_type_id', 2)->delete();
    }
};