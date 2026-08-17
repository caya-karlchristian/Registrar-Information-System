<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * QR / manual claiming (see QR Code Claiming Policy v1.0).
 *
 * claim_code is the short, human-typeable counterpart to the existing
 * `uuid` column: uuid is what gets embedded in the QR image and scanned
 * by the staff webcam, while claim_code exists for the cases the policy
 * still has to account for — no phone, dead battery, a scanner that
 * can't read a bad print, etc. Staff type this in manually as a fallback;
 * students never need to read out or type the uuid itself.
 *
 * Format: 6 characters, uppercase, drawn from a Crockford-style alphabet
 * that excludes visually ambiguous characters (0/O, 1/I/L) so it can be
 * read aloud or typed accurately under counter conditions.
 *
 * Nullable at the DB level so this migration never blocks on existing
 * rows — DocumentRequest::booted() (see the model) guarantees every new
 * row gets one, the same way it already does for uuid.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('document_request', function (Blueprint $table) {
            $table->string('claim_code', 6)->nullable()->unique('document_request_claim_code_unique')->after('uuid');
        });
    }

    public function down(): void
    {
        Schema::table('document_request', function (Blueprint $table) {
            $table->dropUnique('document_request_claim_code_unique');
            $table->dropColumn('claim_code');
        });
    }
};
