<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * A cashier receipt label that CashierDocumentSuggester could not match to
 * any document/certificate type's cashier_document_patterns. See the
 * suggester's class docblock and the table's own migration for the full
 * rationale — this is the operational, admin-driven fix for receipt-label
 * drift, standing in deliberately for algorithmic fuzzy matching.
 */
class UnmatchedCashierItem extends Model
{
    protected $table      = 'unmatched_cashier_items';
    protected $primaryKey = 'unmatched_cashier_item_id';

    protected $fillable = [
        'raw_label',
        'normalised_label',
        'occurrence_count',
        'first_seen_at',
        'last_seen_at',
        'resolved_at',
        'resolved_by',
    ];

    protected $casts = [
        'occurrence_count' => 'integer',
        'first_seen_at'    => 'datetime',
        'last_seen_at'     => 'datetime',
        'resolved_at'      => 'datetime',
    ];

    public function resolvedByUser()
    {
        return $this->belongsTo(SystemUser::class, 'resolved_by', 'user_id');
    }

    /**
     * Record one sighting of a raw label. Upserts on the normalised form:
     * a first sighting creates the row, every later sighting of the same
     * (normalised) label just bumps occurrence_count and last_seen_at.
     *
     * A previously-resolved label that starts appearing again is left
     * resolved — an admin already matched it to a pattern, so the
     * suggester should now be matching it directly; if it's still landing
     * here, the label's dedupe key changed in a way normalise() doesn't
     * account for, which is itself useful signal to leave resolved_at
     * alone and let it surface for review rather than silently reopening.
     *
     * Static normalisation logic is intentionally NOT duplicated here —
     * the caller (CashierDocumentSuggester) already normalised once for
     * its own index lookup, so this method accepts the raw label and
     * re-derives the same normalised form via the shared algorithm to
     * avoid two normalisers ever drifting apart. See normaliseLabel().
     */
    public static function recordSighting(string $rawLabel): void
    {
        $normalised = static::normaliseLabel($rawLabel);

        if ($normalised === '') {
            return;
        }

        $now = now();

        $existing = static::where('normalised_label', $normalised)->first();

        if ($existing) {
            $existing->increment('occurrence_count');
            $existing->forceFill(['last_seen_at' => $now])->save();
            return;
        }

        try {
            static::create([
                'raw_label'        => $rawLabel,
                'normalised_label' => $normalised,
                'occurrence_count' => 1,
                'first_seen_at'    => $now,
                'last_seen_at'     => $now,
            ]);
        } catch (\Illuminate\Database\QueryException $e) {
            // Race: two concurrent submissions saw the same unresolved
            // label at once and both passed the existence check above.
            // The unique index on normalised_label (see migration) makes
            // the loser's insert fail rather than duplicate the row —
            // treat that as "someone else just recorded it" and bump the
            // count instead, rather than surfacing an error to the student
            // over what is purely an internal logging concern.
            if ((string) $e->getCode() === '23000') {
                $row = static::where('normalised_label', $normalised)->first();
                if ($row) {
                    $row->increment('occurrence_count');
                    $row->forceFill(['last_seen_at' => $now])->save();
                }
                return;
            }

            throw $e;
        }
    }

    /**
     * Same normalisation as CashierDocumentSuggester::normalise() — kept
     * here as the single source of truth for what "the same label" means
     * for dedupe purposes, since this model's uniqueness guarantee is the
     * thing that has to stay correct even if the suggester's own copy is
     * ever touched independently.
     */
    public static function normaliseLabel(string $label): string
    {
        $label = mb_strtolower(trim($label));
        $label = preg_replace('/\s+/', ' ', $label) ?? $label;
        $label = rtrim($label, " .,;:-");

        return trim($label);
    }
}
