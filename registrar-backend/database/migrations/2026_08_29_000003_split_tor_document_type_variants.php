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
 *
 * PRODUCTION-SAFETY FIX (2026-09-01): the 10 new variants previously
 * inserted at hardcoded document_type_id 30-39, with idempotency checked
 * by whether those exact IDs existed. On an environment where these TOR
 * variants were already reconciled by hand under DIFFERENT auto-increment
 * IDs (e.g. production, patched directly before this migration existed),
 * that check would find nothing at IDs 30-39 and insert brand-new
 * DUPLICATE rows for names that already exist elsewhere in the table.
 * Idempotency is now resolved by document_name — the Master Catalog's RIS
 * column is the authoritative key for "does this item already exist",
 * never the numeric ID. down() is updated to match: it removes the split
 * rows by name instead of by IDs this migration no longer guarantees.
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
        ['name' => 'Transcript of Records - Undergraduate (2 pages)', 'pattern' => 'Transcript of Records - Undergraduate (2 pages)', 'access_id' => 3],
        ['name' => 'Transcript of Records - Undergraduate (3 pages)', 'pattern' => 'Transcript of Records - Undergraduate (3 pages)', 'access_id' => 3],
        ['name' => 'Transcript of Records (1 page)', 'pattern' => 'Transcript of Records (1 page)', 'access_id' => 3],
        ['name' => 'Transcript of Records - Technology Courses', 'pattern' => 'Transcript of Records - Technology Courses', 'access_id' => 3],
        ['name' => 'Transcript of Records - 2nd Copy (Graduate, Engineering)', 'pattern' => 'Transcript of Records - 2nd copy (graduate-engineering)', 'access_id' => 2],
        ['name' => 'Transcript of Records - 2nd Copy (Non-Engineering Graduate)', 'pattern' => 'Transcript of Records - 2nd copy (non-engineering graduate)', 'access_id' => 2],
        ['name' => 'Transcript of Records (Graduate, Engineering - Copy For)', 'pattern' => 'Transcript of Records (graduate-Engineering/Copy for)', 'access_id' => 2],
        ['name' => 'Transcript of Records (Graduate, Non-Engineering - Copy For)', 'pattern' => 'Transcript of Records (graduate-Non-Engineering/Copy for)', 'access_id' => 2],
        ['name' => 'Transcript of Records (OU)', 'pattern' => 'Transcript of Records (OU)', 'access_id' => 3],
        ['name' => 'Transcript of Records - 2nd Copy (Graduate, Non-Engineering)', 'pattern' => 'Transcript of Records - 2nd copy (graduate-non-engineering)', 'access_id' => 2],
    ];

    private const BASE_PATTERN = 'Transcript of Records';
    private const BASE_ACCESS_ID = 3;

    // Fallback placeholders — only used on a fresh environment where
    // neither a legacy unsplit row nor an already-reconciled base row
    // exists yet, so there is no real data to template from.
    private const PENDING_PROCESS_PERIOD = 'Pending admin configuration - set via Document Management';
    private const PENDING_REQUIREMENTS = 'Pending admin configuration - set via Document Management';

    public function up(): void
    {
        DB::transaction(function () {
            // Idempotency guard, resolved by name: if all 10 new variants
            // already exist by name (e.g. hand-reconciled production data
            // under different auto-increment IDs), nothing left to insert —
            // but the base row below is still checked/updated independently,
            // since "TOR (base)" and "the 10 variants" are tracked
            // separately and either can be partially done.
            $existingVariantNames = DB::table('document_type')
                ->whereIn('document_name', array_column(self::NEW_VARIANTS, 'name'))
                ->pluck('document_name')
                ->all();

            $logbookId = $this->firstOrCreateLogbookCategory(self::LOGBOOK_NAME);

            // Resolve the base "Transcript of Records" row by name, not by
            // the historical id=15 — that id is not guaranteed on every
            // environment. If a plain "Transcript of Records" row already
            // exists (e.g. hand-reconciled production), it's used as-is
            // and the legacy combined row (if a different, still-unsplit
            // one exists) is left for the "look up original" step below.
            $baseRow = DB::table('document_type')->where('document_name', 'Transcript of Records')->first();

            // The legacy, not-yet-split row (still carries the original
            // bundled name/patterns). Matched by id=15 for backward
            // compatibility with environments where it hasn't moved, but
            // this is only used as a data TEMPLATE (requirements/process
            // period) and to know whether to repurpose it — never as the
            // sole existence check.
            $legacy = DB::table('document_type')->where('document_type_id', 15)->first();
            $legacyStillUnsplit = $legacy && $legacy->document_name !== 'Transcript of Records';

            if (!$baseRow && $legacyStillUnsplit) {
                // Repurpose the legacy row into the base variant — preserves
                // any existing request_document.document_type_id = 15
                // references.
                DB::table('document_type')->where('document_type_id', 15)->update([
                    'document_name' => 'Transcript of Records',
                    'access_id' => self::BASE_ACCESS_ID,
                    'cashier_document_patterns' => json_encode([self::BASE_PATTERN]),
                    'logbook_category_id' => $logbookId,
                    'requires_source_submission' => false,
                ]);
                $baseRow = DB::table('document_type')->where('document_type_id', 15)->first();
            } elseif (!$baseRow) {
                // Neither a base row nor an unsplit legacy row exists yet
                // (fresh environment) — create the base row outright.
                $newId = DB::table('document_type')->insertGetId([
                    'document_name' => 'Transcript of Records',
                    'document_description' => '',
                    'document_requirements' => self::PENDING_REQUIREMENTS,
                    'document_process_period' => self::PENDING_PROCESS_PERIOD,
                    'access_id' => self::BASE_ACCESS_ID,
                    'cashier_document_patterns' => json_encode([self::BASE_PATTERN]),
                    'logbook_category_id' => $logbookId,
                    'requires_source_submission' => false,
                ], 'document_type_id');
                $baseRow = DB::table('document_type')->where('document_type_id', $newId)->first();
            }

            // Template values for the 10 variants: prefer the legacy row's
            // original requirements/process period (pre-split source of
            // truth) when available, otherwise fall back to the base row
            // (nullsafe — never dereferences a null object).
            $template = $legacy ?? $baseRow;

            $shared = [
                'document_description' => $template?->document_description ?? '',
                'document_requirements' => $template?->document_requirements ?? self::PENDING_REQUIREMENTS,
                'document_process_period' => $template?->document_process_period ?? self::PENDING_PROCESS_PERIOD,
                'logbook_category_id' => $logbookId,
                'requires_source_submission' => false,
            ];

            $rows = [];
            foreach (self::NEW_VARIANTS as $variant) {
                if (in_array($variant['name'], $existingVariantNames, true)) {
                    continue; // idempotency guard — already exists under some ID
                }

                $rows[] = array_merge($shared, [
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
            // Remove the 10 split-off rows, by name (their IDs are no
            // longer guaranteed to be 30-39 — see class docblock's
            // 2026-09-01 note).
            DB::table('document_type')
                ->whereIn('document_name', array_column(self::NEW_VARIANTS, 'name'))
                ->delete();

            // Restore the base row to its original, pre-split state (all 11
            // patterns collapsed back into one row), found by its current
            // post-split name rather than a hardcoded id.
            DB::table('document_type')
                ->where('document_name', 'Transcript of Records')
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
