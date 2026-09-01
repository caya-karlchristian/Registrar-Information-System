<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * Data migration — reconciles document_type/certificate_type against the
 * final Cashier/Registrar document list (Registrar-Cashier-Documents.pdf),
 * per team decision:
 *
 *   1. CTC ("Certified True Copy") and Authentication Fee items are NOT
 *      certificate_type rows. Certificates require in-system generation;
 *      CTC does not (Registrar certifies something that already exists),
 *      so by the team's own document_type/certificate_type definition CTC
 *      belongs in document_type, same as any other non-generated
 *      document. certificate_type_id 7 ("Certified True Copy of Records")
 *      is deleted here — it must never appear as a selectable certificate
 *      again.
 *
 *   2. Each of the 9 CTC/Authentication Fee source-document combinations
 *      becomes its OWN document_type row — not a flag on the plain
 *      document, not merged together — so the system always knows
 *      exactly which source document is being certified (the original
 *      gap this whole reconciliation exists to close). All 9 share one
 *      logbook_category ("Certified True Copy of Records") so they still
 *      collapse to a single logbook line, and all 9 are
 *      requires_source_submission = true, since a CTC can't be processed
 *      until the client hands over the source document.
 *
 *   3. document_type_id 10 previously crammed three distinct actions
 *      (Correction of Entry of Grade / Completion of Incomplete Grade /
 *      Late Reporting of Grade) into one comma-joined name. Split into
 *      three real rows sharing one logbook_category ("Completion Fee"),
 *      restoring the ability to track/process them separately.
 *
 * ASSUMPTIONS FLAGGED FOR ADMIN REVIEW (deliberately not guessed further
 * than the source data supports):
 *   - The 9 new CTC rows are seeded with a placeholder
 *     document_process_period and document_requirements, since actual
 *     per-variant processing time/requirements weren't available. MUST be
 *     set via the existing "Add Document" admin screen before these are
 *     used for real requests — they will otherwise show a visible
 *     "Pending admin configuration" placeholder.
 *   - The two new split rows (Completion of Incomplete Grade / Late
 *     Reporting of Grade) inherit requirements/process period/access_id
 *     from the original id=10 row as a starting point. Review and adjust
 *     per-variant if they actually differ in practice.
 *   - access_id (stakeholder) for each CTC row is taken directly from the
 *     PDF's STAKEHOLDER column (1 = Student, 2 = Alumni, 3 = Both — see
 *     AccessType model docblock for this mapping).
 *   - Cashier patterns for the Completion Fee split are a best-effort
 *     read of a garbled section of the source PDF table — double-check
 *     these three against the raw Cashier list before relying on
 *     auto-matching for them.
 *
 * SELF-CONTAINED DEPENDENCY: this migration inserts document_type rows
 * with a hard access_id FK dependency on access_type (1=Student,
 * 2=Alumni, 3=Both). Those three rows are normally seeded by
 * DatabaseSeeder — but that only runs when someone remembers to add
 * --seed, and this is a migration, not a seeder call. A plain
 * `migrate:fresh` (no --seed) — the default a fresh environment, CI
 * pipeline, or another dev's machine would reach for — hits document_type
 * before access_type exists at all, and every insert below fails with an
 * FK violation. ensureAccessTypesExist() below closes that gap directly:
 * it upserts the same 3 fixed rows DatabaseSeeder already seeds, using
 * the identical updateOrInsert-on-primary-key pattern, so it's a no-op
 * wherever the seeder already ran and a real fix wherever it didn't.
 *
 * SAFETY: refuses to delete certificate_type_id 7 if any request_certificate
 * row still references it (fails loudly with a clear message instead of
 * silently orphaning historical request data). If that happens, resolve
 * or reassign those requests first, then re-run.
 *
 * PRODUCTION-SAFETY FIX (2026-09-01): splitCompletionFeeRow() and
 * insertCtcDocumentTypes() previously checked idempotency by hardcoded
 * document_type_id (10/19/20 and 21-29) and inserted rows at those exact
 * IDs. On an environment where these items were already reconciled by
 * hand under DIFFERENT auto-increment IDs (e.g. production, patched
 * directly via tinker before this migration existed), those ID-based
 * checks would find nothing at IDs 19-29 and happily insert brand-new
 * DUPLICATE rows for names that already exist elsewhere in the table.
 * Both methods now resolve idempotency by document_name — the Master
 * Catalog's RIS column is the authoritative key for "does this item
 * already exist", never the numeric ID — so this is safe to run whether
 * the target rows already exist under any ID, don't exist yet, or exist
 * partially. down() is updated to match: it now removes rows by name
 * instead of by the IDs this migration no longer guarantees.
 */
return new class extends Migration
{
    private const CTC_LOGBOOK_NAME = 'Certified True Copy of Records';
    private const COMPLETION_FEE_LOGBOOK_NAME = 'Completion Fee';

    private const PENDING_PROCESS_PERIOD = 'Pending admin configuration - set via Document Management';
    private const PENDING_REQUIREMENTS = 'TODO (admin): confirm exact requirements for this certified-copy variant. Must include, at minimum, the original/photocopy of the source document being certified, proof of payment, and valid ID.';

    /**
     * Mirrors DatabaseSeeder's access_type rows exactly (1=Student,
     * 2=Alumni, 3=Both) — see AccessType model docblock for the
     * canonical mapping this migration and the seeder both rely on.
     */
    private const ACCESS_TYPES = [
        ['access_id' => 1, 'access_name' => 'Student'],
        ['access_id' => 2, 'access_name' => 'Alumni'],
        ['access_id' => 3, 'access_name' => 'Both'],
    ];

    /**
     * The 9 CTC / Authentication Fee source-document combinations, taken
     * directly from the Cashier reference PDF. access_id follows
     * AccessType's seeded convention: 1 = Student, 2 = Alumni, 3 = Both.
     */
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

    /** The two rows split off from the legacy combined document_type_id 10 row. */
    private const COMPLETION_FEE_SPLIT_NAMES = ['Completion of Incomplete Grade', 'Late Reporting of Grade'];

    /** document_name the legacy combined row is repurposed into (kept, never deleted). */
    private const COMPLETION_FEE_BASE_NAME = 'Correction of Entry of Grade';

    public function up(): void
    {
        DB::transaction(function () {
            $this->ensureAccessTypesExist();

            $ctcLogbookId = $this->firstOrCreateLogbookCategory(self::CTC_LOGBOOK_NAME);
            $completionLogbookId = $this->firstOrCreateLogbookCategory(self::COMPLETION_FEE_LOGBOOK_NAME);

            $this->deleteCertificateType7();
            $this->splitCompletionFeeRow($completionLogbookId);
            $this->insertCtcDocumentTypes($ctcLogbookId);
        });
    }

    public function down(): void
    {
        DB::transaction(function () {
            // Remove the 9 CTC rows, by name (their IDs are no longer
            // guaranteed to be 21-29 — see class docblock's 2026-09-01 note).
            DB::table('document_type')
                ->whereIn('document_name', array_column(self::CTC_DOCUMENT_TYPES, 'name'))
                ->delete();

            // Remove the split-off Completion Fee rows, by name.
            DB::table('document_type')
                ->whereIn('document_name', self::COMPLETION_FEE_SPLIT_NAMES)
                ->delete();

            // Restore the original combined row (found by its current,
            // post-split name — see class docblock's 2026-09-01 note).
            DB::table('document_type')
                ->where('document_name', self::COMPLETION_FEE_BASE_NAME)
                ->update([
                    'document_name' => "Correction of Entry of Grade,\nCompletion of Incomplete Grade,\nLate Reporting of Grade",
                    'cashier_document_patterns' => null,
                    'logbook_category_id' => null,
                ]);

            // Best-effort restore of certificate_type 7 (original seeded values).
            if (!DB::table('certificate_type')->where('certificate_type_id', 7)->exists()) {
                DB::table('certificate_type')->insert([
                    'certificate_type_id' => 7,
                    'certificate_name' => 'Certified True Copy of Records',
                    'certificate_requirements' => '',
                    'certificate_process_period' => '',
                    'access_id' => 3,
                    'cashier_document_patterns' => json_encode([
                        'Certified True Copy - Informative Copy of Grades',
                        'Authentication Fee - Transcript of Records',
                        'Authentication Fee - Transcript & Diploma',
                    ]),
                    'layout_header_left_url' => null,
                    'layout_header_right_url' => null,
                    'layout_footer_urls' => json_encode([]),
                    'layout_header_logo_size' => 56,
                    'layout_footer_logo_size' => 56,
                ]);
            }

            DB::table('logbook_category')->whereIn('name', [
                self::CTC_LOGBOOK_NAME,
                self::COMPLETION_FEE_LOGBOOK_NAME,
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
            // Already removed (idempotent re-run) — nothing to do.
            return;
        }

        $stillInUse = DB::table('request_certificate')->where('certificate_type_id', 7)->count();
        if ($stillInUse > 0) {
            throw new \RuntimeException(
                "Cannot delete certificate_type_id=7: {$stillInUse} request_certificate row(s) still reference it. ".
                'Resolve or reassign those requests before running this migration.'
            );
        }

        DB::table('certificate_type')->where('certificate_type_id', 7)->delete();
    }

    /**
     * Splits the legacy combined "Correction of Entry of Grade / Completion
     * of Incomplete Grade / Late Reporting of Grade" row into three rows.
     *
     * Idempotency is resolved by document_name, never by ID: an environment
     * may already have "Completion of Incomplete Grade" and
     * "Late Reporting of Grade" as their own rows under IDs this migration
     * did not create (e.g. hand-reconciled production data), in which case
     * this is a no-op for those names.
     */
    private function splitCompletionFeeRow(int $completionLogbookId): void
    {
        $splitNamesAlreadyExist = DB::table('document_type')
            ->whereIn('document_name', self::COMPLETION_FEE_SPLIT_NAMES)
            ->pluck('document_name')
            ->all();

        // Repurpose the legacy combined row into the "base" split name, if
        // it still exists under its legacy combined name. Matched by name,
        // not by the historical id=10 — that id is not guaranteed on every
        // environment (e.g. an environment seeded fresh after this
        // reconciliation already existed).
        $legacyCombinedNames = [
            "Correction of Entry of Grade,\nCompletion of Incomplete Grade,\nLate Reporting of Grade",
            'Correction of Entry of Grade, Completion of Incomplete Grade, Late Reporting of Grade',
        ];
        $legacyRow = DB::table('document_type')
            ->whereIn('document_name', $legacyCombinedNames)
            ->first();

        if ($legacyRow) {
            DB::table('document_type')->where('document_type_id', $legacyRow->document_type_id)->update([
                'document_name' => self::COMPLETION_FEE_BASE_NAME,
                'cashier_document_patterns' => json_encode([
                    'Correction of Entry of Grade',
                    'Completion Fee (correction of entry)',
                ]),
                'logbook_category_id' => $completionLogbookId,
            ]);
        }

        // Look up a row (the just-repurposed legacy row, or a
        // pre-existing/hand-reconciled one) to use as the template for
        // requirements/process period/access_id on the newly-created rows.
        $template = DB::table('document_type')->where('document_name', self::COMPLETION_FEE_BASE_NAME)->first();

        // Nullsafe throughout: $template is null on an environment that
        // never had the legacy combined row at all (e.g. a fresh DB where
        // this reconciliation is effectively creating these rows for the
        // first time) — falls back to the same placeholder text the CTC
        // rows use rather than dereferencing a null object.
        $shared = [
            'document_description' => $template?->document_description ?? '',
            'document_requirements' => $template?->document_requirements ?? self::PENDING_REQUIREMENTS,
            'document_process_period' => $template?->document_process_period ?? self::PENDING_PROCESS_PERIOD,
            'access_id' => $template?->access_id ?? 1, // Student, per Master Catalog STAKEHOLDER column.
            'logbook_category_id' => $completionLogbookId,
            'requires_source_submission' => false,
        ];

        $newRows = [
            'Completion of Incomplete Grade' => ['Completion of Incomplete Grade'],
            // Cashier pattern intentionally left as an empty array here, not
            // guessed: per 2026_08_29_000006, "Late Reporting of Grade" has
            // no real Cashier item behind it — a deliberate, documented
            // team decision, not an oversight. Do not add a pattern here.
            'Late Reporting of Grade' => [],
        ];

        foreach ($newRows as $name => $patterns) {
            if (in_array($name, $splitNamesAlreadyExist, true)) {
                continue; // idempotent re-run / already hand-reconciled elsewhere
            }

            DB::table('document_type')->insert(array_merge($shared, [
                'document_name' => $name,
                'cashier_document_patterns' => json_encode($patterns),
            ]));
        }
    }

    /**
     * Inserts the 9 CTC / Authentication Fee document_type rows.
     *
     * Idempotency is resolved by document_name, never by ID: on a database
     * where these already exist under different auto-increment IDs (e.g.
     * hand-reconciled production data), this correctly finds them and
     * skips, instead of inserting duplicates.
     */
    private function insertCtcDocumentTypes(int $ctcLogbookId): void
    {
        $existingNames = DB::table('document_type')
            ->whereIn('document_name', array_column(self::CTC_DOCUMENT_TYPES, 'name'))
            ->pluck('document_name')
            ->all();

        $rows = [];
        foreach (self::CTC_DOCUMENT_TYPES as $ctc) {
            if (in_array($ctc['name'], $existingNames, true)) {
                continue; // idempotency guard — already exists under some ID
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
