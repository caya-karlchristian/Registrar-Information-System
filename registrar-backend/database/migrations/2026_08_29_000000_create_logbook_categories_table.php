<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * logbook_category — the umbrella label a document/certificate type is
 * logged under, independent of its processing identity.
 *
 * Why this exists: certificate_type_id 7 ("Certified True Copy of Records")
 * and document_type_id 10 (the "Correction of Entry of Grade,\nCompletion
 * of Incomplete Grade,\nLate Reporting of Grade" row) both tried to solve
 * "these should show as one logbook line" by cramming several real,
 * separately-processed items into a single row's name. That destroys the
 * distinction the system needs at processing time — see
 * 2026_08_29_000002_reconcile_ctc_and_completion_fee_document_types.php,
 * which undoes both and re-does them properly using this table.
 *
 * This table lets identity (a document_type/certificate_type row) and
 * display (the logbook line) vary independently: many rows can point at
 * one logbook_category via the nullable logbook_category_id FK added in
 * the next migration. A NULL logbook_category_id means "log under this
 * row's own name" — most rows won't need an explicit category at all,
 * since most items don't collapse with anything else (see the LOGBOOK
 * column in the Cashier reference PDF — the vast majority of rows are
 * 1:1 with their own name).
 *
 * Deliberately a plain lookup table (same shape as access_type), not an
 * enum — so admins can add/rename categories from an admin screen later
 * without a migration or deploy.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('logbook_category')) {
            return;
        }

        Schema::create('logbook_category', function (Blueprint $table) {
            $table->integer('logbook_category_id')->autoIncrement();
            $table->string('name', 150);
            $table->timestamp('created_at')->nullable()->useCurrent();
            $table->timestamp('updated_at')->nullable()->useCurrent()->useCurrentOnUpdate();

            $table->unique('name', 'logbook_category_name_unique');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('logbook_category');
    }
};
