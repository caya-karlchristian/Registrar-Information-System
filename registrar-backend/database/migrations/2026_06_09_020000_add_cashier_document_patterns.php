<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Adds cashier_document_patterns (JSON, nullable) to document_type and
 * certificate_type tables.
 *
 * Each row stores an array of exact cashier `document` label strings that
 * count as valid payment for that RIS document/certificate type.
 * NULL means the type has no cashier equivalent — the OR is still verified
 * for existence and name, but no item cross-check is performed.
 *
 * Patterns are matched case-insensitively at runtime by CashierDocumentMatcher.
 * Admins can update patterns via the existing document-type/certification CRUD
 * endpoints without a code deploy.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('document_type', function (Blueprint $table) {
            $table->json('cashier_document_patterns')->nullable()->after('access_id');
        });

        Schema::table('certificate_type', function (Blueprint $table) {
            $table->json('cashier_document_patterns')->nullable()->after('access_id');
        });
    }

    public function down(): void
    {
        Schema::table('document_type', function (Blueprint $table) {
            $table->dropColumn('cashier_document_patterns');
        });

        Schema::table('certificate_type', function (Blueprint $table) {
            $table->dropColumn('cashier_document_patterns');
        });
    }
};
