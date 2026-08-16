<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Operational fix for cashier receipt-label drift (see
 * CashierDocumentSuggester's class docblock).
 *
 * Rather than fuzzy-matching receipt labels against document/certificate
 * types — risky for a payment-adjacent feature — every label the
 * suggester couldn't resolve is logged here. Registrar staff review these
 * on the Unmatched Cashier Items admin screen (Phase 5) and attach a new
 * one to the correct type's `cashier_document_patterns` in one action.
 * Every future receipt using that label then auto-matches, with no code
 * deploy required.
 *
 * One row per distinct raw label; repeated sightings bump
 * `occurrence_count` and `last_seen_at` rather than inserting duplicates,
 * so the admin screen can be sorted by "most common unresolved label"
 * without a separate aggregation query.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('unmatched_cashier_items', function (Blueprint $table) {
            $table->id('unmatched_cashier_item_id');

            // Raw label exactly as it appeared on the receipt (pre-normalisation)
            // so an admin reviewing it sees precisely what the cashier system sent.
            $table->string('raw_label', 255);

            // Normalised form (see CashierDocumentSuggester::normalise) — this is
            // the dedupe key, NOT raw_label, so "Info. Copy" and "info copy" collapse
            // into one row instead of two near-identical ones cluttering the screen.
            $table->string('normalised_label', 255);

            $table->unsignedInteger('occurrence_count')->default(1);
            $table->timestamp('first_seen_at');
            $table->timestamp('last_seen_at');

            // Set once an admin attaches this label to a document/certificate type's
            // cashier_document_patterns, so resolved rows can be hidden from the
            // default admin view without deleting the audit trail of what happened.
            $table->timestamp('resolved_at')->nullable();
            $table->unsignedBigInteger('resolved_by')->nullable();

            $table->timestamps();

            $table->unique('normalised_label', 'unmatched_cashier_items_normalised_unique');
            $table->index('resolved_at', 'unmatched_cashier_items_resolved_at_idx');

            $table->foreign('resolved_by')
                ->references('user_id')->on('users')
                ->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('unmatched_cashier_items');
    }
};
