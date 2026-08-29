<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * Data migration — splits document_type_id 15 ("Transcript of Records
 * (TOR)") from one row covering 11 Cashier patterns into 11 separate
 * rows, all sharing one logbook_category ("Transcript of Records").
 *
 * Same shape as 2026_08_29_000002 (CTC / Completion Fee), applied to TOR
 * per team decision: even though every TOR variant currently has the
 * same processing period and requirements, they're kept as one row today
 * only because nothing forced them apart — not because they're
 * guaranteed to always behave identically. Splitting now means a future
 * difference (e.g. "2nd copy, non-engineering graduate" taking longer
 * than "1 page") is a data edit on that one row via the existing Add
 * Document screen, not a migration.
 *
 * document_type_id 15 is KEPT and repurposed as the plain "Transcript of
 * Records" variant (base Cashier pattern 'Transcript of Records') rather
 * than deleted, so any existing request_document rows that already
 * reference id 15 keep pointing at a valid, correctly-labeled row instead
 * of being orphaned. The other 10 variants become new rows (ids 30-39).
 *
 * All 11 rows inherit document_requirements/document_process_period/
 * access_id from the original id=15 row as their starting values, per
 * team instruction ("for now yes, they should be the same ... we can
 * appropriate later") — access_id is the one exception, set per-row from
 * the Cashier reference PDF's STAKEHOLDER column where a variant is
 * Alumni-only (2nd-copy / "graduate copy for" variants), since that's
 * already enforced today and is not something we're deferring.
 *
 * SAFETY: idempotent — skips work already done (detected via the id=15
 * row's current cashier_document_patterns) so it's safe to re-run.
 */
return new class extends Migration
{
    private const LOGBOOK_NAME = 'Transcript of Records';

    /**
     * The 10 variants that move to new rows. access_id follows
     * AccessType's seeded convention: 1 = Student, 2 = Alumni, 3 = Both
     * (see AccessType model docblock), taken from the Cashier reference
     * PDF's STAKEHOLDER column.
     */
    private const NEW_VARIANTS = [
        ['id' => 30, 'name' => 'Transcript of Records - Undergraduate (2 pages)', 'pattern' => 'Transcript of Records - Undergraduate (2 pages)', 'access_id' => 3],
        ['id' => 31, 'name' => 'Transcript of Records - Undergraduate (3 pages)', 'pattern' => 'Transcript of Records - Undergraduate (3 pages)', 'access_id' => 3],
        ['id' => 32, 'name' => 'Transcript of Records (1 page)', 'pattern' => 'Transcript of Records (1 page)', 'access_id' => 3],
        ['id' => 33, 'name' => 'Transcript of Records - Technology Courses', 'pattern' => 'Transcript of Records - Technology Courses', 'access_id' => 3],
        ['id' => 34, 'name' => 'Transcript of Records - 2nd Copy (Graduate, Engineering)', 'pattern' => 'Transcript of Records - 2nd copy (graduate-engineering)', 'access_id' => 2],
        ['id' => 35, 'name' => 'Transcript of Records - 2nd Copy (Non-Engineering Graduate)', 'pattern' => 'Transcript of Records - 2nd copy (non-engineering graduate)', 'access_id' => 2],
        ['id' => 36, 'name' => 'Transcript of Records (Graduate, Engineering - Copy For)', 'pattern' => 'Transcript of Records (graduate-Engineering/Copy for)', 'access_id' => 2],
        ['id' => 37, 'name' => 'Transcript of Records (Graduate, Non-Engineering - Copy For)', 'pattern' => 'Transcript of Records (graduate-Non-Engineering/Copy for)', 'access_id' => 2],
        ['id' => 38, 'name' => 'Transcript of Records (OU)', 'pattern' => 'Transcript of Records (OU)', 'access_id' => 3],
        ['id' => 39, 'name' => 'Transcript of Records - 2nd Copy (Graduate, Non-Engineering)', 'pattern' => 'Transcript of Records - 2nd copy (graduate-non-engineering)', 'access_id' => 2],
    ];

    private const BASE_PATTERN = 'Transcript of Records';
    private const BASE_ACCESS_ID = 3;

    public function up(): void
    {
        DB::transaction(function () {
            $original = DB::table('document_type')->where('document_type_id', 15)->first();

            if (!$original) {
                // Row doesn't exist in this environment — nothing to split.
                return;
            }

            if ($original->document_name === 'Transcript of Records') {
                // Already migrated (idempotent re-run) — skip.
                return;
            }

            $logbookId = $this->firstOrCreateLogbookCategory(self::LOGBOOK_NAME);

            // Repurpose id=15 as the plain/base variant — preserves any
            // existing request_document.document_type_id = 15 references.
            DB::table('document_type')->where('document_type_id', 15)->update([
                'document_name' => 'Transcript of Records',
                'access_id' => self::BASE_ACCESS_ID,
                'cashier_document_patterns' => json_encode([self::BASE_PATTERN]),
                'logbook_category_id' => $logbookId,
                'requires_source_submission' => false,
            ]);

            $shared = [
                'document_description' => $original->document_description ?? '',
                'document_requirements' => $original->document_requirements,
                'document_process_period' => $original->document_process_period,
                'logbook_category_id' => $logbookId,
                'requires_source_submission' => false,
            ];

            $existingIds = DB::table('document_type')
                ->whereIn('document_type_id', array_column(self::NEW_VARIANTS, 'id'))
                ->pluck('document_type_id')
                ->all();

            $rows = [];
            foreach (self::NEW_VARIANTS as $variant) {
                if (in_array($variant['id'], $existingIds, true)) {
                    continue; // idempotency guard for partial re-runs
                }

                $rows[] = array_merge($shared, [
                    'document_type_id' => $variant['id'],
                    'document_name' => $variant['name'],
                    'access_id' => $variant['access_id'],
                    'cashier_document_patterns' => json_encode([$variant['pattern']]),
                ]);
            }

            if (!empty($rows)) {
                DB::table('document_type')->insert($rows);
            }
        });
    }

    public function down(): void
    {
        DB::transaction(function () {
            // Remove the 10 split-off rows.
            DB::table('document_type')
                ->whereIn('document_type_id', array_column(self::NEW_VARIANTS, 'id'))
                ->delete();

            // Restore id=15 to its original, pre-split state (all 11
            // patterns collapsed back into one row).
            DB::table('document_type')
                ->where('document_type_id', 15)
                ->update([
                    'document_name' => 'Transcript of Records (TOR)',
                    'access_id' => 3,
                    'cashier_document_patterns' => json_encode([
                        'Transcript of Records', 'Transcript of Records - Undergraduate (2 pages)',
                        'Transcript of Records - Undergraduate (3 pages)', 'Transcript of Records (1 page)',
                        'Transcript of Records - Technology Courses', 'Transcript of Records - 2nd copy (graduate-engineering)',
                        'Transcript of Records - 2nd copy (non-engineering graduate)', 'Transcript of Records (graduate-Engineering/Copy for)',
                        'Transcript of Records (graduate-Non-Engineering/Copy for)', 'Transcript of Records (OU)',
                        'Transcript of Records - 2nd copy (graduate-non-engineering)',
                    ]),
                    'logbook_category_id' => null,
                    'requires_source_submission' => false,
                ]);

            // Only remove the logbook category if nothing else still uses
            // it (safe even though nothing else currently points at it).
            $stillReferenced = DB::table('document_type')
                ->where('logbook_category_id', function ($query) {
                    $query->select('logbook_category_id')
                        ->from('logbook_category')
                        ->where('name', self::LOGBOOK_NAME);
                })
                ->exists();

            if (!$stillReferenced) {
                DB::table('logbook_category')->where('name', self::LOGBOOK_NAME)->delete();
            }
        });
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
};
