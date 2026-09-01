<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * Data migration — reconciles document_type/certificate_type strictly against
 * the Master Catalog[cite: 4].
 *
 * 1. CTC ("Certified True Copy") and Authentication Fee items are stored strictly
 *    in document_type[cite: 4]. certificate_type_id 7 ("Certified True Copy of Records") is
 *    deleted here if no requests reference it[cite: 4].
 *
 * 2. The 9 CTC/Authentication Fee source-document combinations exist as individual
 *    document_type rows sharing one logbook_category ("Certified True Copy of Records")[cite: 4].
 *
 * 3. Handles "Completion of Incomplete Grade" and "Correction of Entry of Grade"
 *    as distinct active items sharing one logbook_category ("Correction of Entry of Grade,
 *    Completion of Incomplete Grade, Late Reporting of Grade")[cite: 4].
 *    No "Late Reporting of Grade" document_type row is created[cite: 4].
 */
return new class extends Migration
{
    private const CTC_LOGBOOK_NAME = 'Certified True Copy of Records';
    private const GRADE_CORRECTION_LOGBOOK_NAME = 'Correction of Entry of Grade, Completion of Incomplete Grade, Late Reporting of Grade';

    private const PENDING_PROCESS_PERIOD = 'Pending admin configuration - set via Document Management';
    private const PENDING_REQUIREMENTS = 'TODO (admin): confirm exact requirements for this certified-copy variant. Must include, at minimum, the original/photocopy of the source document being certified, proof of payment, and valid ID.';

    private const ACCESS_TYPES = [
        ['access_id' => 1, 'access_name' => 'Student'],
        ['access_id' => 2, 'access_name' => 'Alumni'],
        ['access_id' => 3, 'access_name' => 'Both'],
    ];

    private const CTC_DOCUMENT_TYPES = [
        ['name' => 'Authentication Fee - Diploma', 'access_id' => 2],
        ['name' => 'Authentication Fee - Transcript & Diploma', 'access_id' => 2],
        ['name' => 'Authentication Fee - Transcript of Records', 'access_id' => 2],
        ['name' => 'Certified True Copy - Certificate of Registration', 'access_id' => 1],
        ['name' => 'Certified True Copy - Certificate of Candidacy', 'access_id' => 3],
        ['name' => 'Certified True Copy - Certificate of Graduation', 'access_id' => 3],
        ['name' => 'Certified True Copy - Diploma', 'access_id' => 2],
        ['name' => 'Certified True Copy - Informative Copy of Grades', 'access_id' => 2],
        ['name' => 'Certified True Copy - Transcript of Records', 'access_id' => 3],
    ];

    private const GRADE_CORRECTION_SPLIT_NAMES = [
        'Completion of Incomplete Grade',
        'Correction of Entry of Grade',
    ];

    public function up(): void
    {
        DB::transaction(function () {
            $this->ensureAccessTypesExist();

            $ctcLogbookId = $this->firstOrCreateLogbookCategory(self::CTC_LOGBOOK_NAME);
            $gradeLogbookId = $this->firstOrCreateLogbookCategory(self::GRADE_CORRECTION_LOGBOOK_NAME);

            $this->deleteCertificateType7();
            $this->reconcileGradeCorrectionRows($gradeLogbookId);
            $this->insertCtcDocumentTypes($ctcLogbookId);
        });
    }

    public function down(): void
    {
        DB::transaction(function () {
            DB::table('document_type')
                ->whereIn('document_name', array_column(self::CTC_DOCUMENT_TYPES, 'name'))
                ->delete();

            DB::table('logbook_category')->whereIn('name', [
                self::CTC_LOGBOOK_NAME,
                self::GRADE_CORRECTION_LOGBOOK_NAME,
            ])->delete();
        });
    }

    private function ensureAccessTypesExist(): void
    {
        foreach (self::ACCESS_TYPES as $row) {
            DB::table('access_type')->updateOrInsert(
                ['access_id' => $row['access_id']],
                ['access_name' => $row['access_name']]
            );
        }
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

    private function deleteCertificateType7(): void
    {
        if (!DB::table('certificate_type')->where('certificate_type_id', 7)->exists()) {
            return;
        }

        $stillInUse = DB::table('request_certificate')->where('certificate_type_id', 7)->count();
        if ($stillInUse > 0) {
            throw new \RuntimeException(
                "Cannot delete certificate_type_id=7: {$stillInUse} request_certificate row(s) still reference it."
            );
        }

        DB::table('certificate_type')->where('certificate_type_id', 7)->delete();
    }

    private function reconcileGradeCorrectionRows(int $logbookCategoryId): void
    {
        DB::table('document_type')
            ->whereIn('document_name', self::GRADE_CORRECTION_SPLIT_NAMES)
            ->update([
                'logbook_category_id' => $logbookCategoryId,
            ]);

        $legacyCombinedNames = [
            "Correction of Entry of Grade,\nCompletion of Incomplete Grade,\nLate Reporting of Grade",
            'Correction of Entry of Grade, Completion of Incomplete Grade, Late Reporting of Grade',
        ];

        $legacyRow = DB::table('document_type')
            ->whereIn('document_name', $legacyCombinedNames)
            ->first();

        if ($legacyRow) {
            DB::table('document_type')
                ->where('document_type_id', $legacyRow->document_type_id)
                ->update([
                    'is_archived' => 1,
                    'logbook_category_id' => $logbookCategoryId,
                ]);
        }
    }

    private function insertCtcDocumentTypes(int $ctcLogbookId): void
    {
        $existingNames = DB::table('document_type')
            ->whereIn('document_name', array_column(self::CTC_DOCUMENT_TYPES, 'name'))
            ->pluck('document_name')
            ->all();

        $rows = [];
        foreach (self::CTC_DOCUMENT_TYPES as $ctc) {
            if (in_array($ctc['name'], $existingNames, true)) {
                continue;
            }

            $rows[] = [
                'document_name' => $ctc['name'],
                'document_description' => '',
                'document_requirements' => self::PENDING_REQUIREMENTS,
                'document_process_period' => self::PENDING_PROCESS_PERIOD,
                'access_id' => $ctc['access_id'],
                'cashier_document_patterns' => json_encode([$ctc['name']]),
                'logbook_category_id' => $ctcLogbookId,
                'requires_source_submission' => true,
            ];
        }

        if (!empty($rows)) {
            DB::table('document_type')->insert($rows);
        }
    }
};