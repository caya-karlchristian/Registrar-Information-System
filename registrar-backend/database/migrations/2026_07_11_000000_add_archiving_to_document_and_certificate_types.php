<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Adds soft-archive support to document_type and certificate_type.
 *
 * The frontend (ArchivedManagement.jsx, DocumentAndCertificateManagement.jsx)
 * has always referenced `is_archived` / `archived_on` on these two models,
 * but the columns never existed in the schema — archive/restore only ever
 * mutated local React state and was lost on refresh. This migration adds
 * the real columns so DocumentTypeController / CertificationTypeController
 * can persist archive state instead of the current hard `->delete()`.
 *
 * `is_archived` defaults to false so existing rows are unaffected.
 * `archived_on` is nullable — only set when a row is archived.
 *
 * IDEMPOTENCY NOTE: written the same defensive way as the other migrations
 * in this batch (2026_07_03 through 2026_07_08) — safe to re-run from any
 * partial state.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('document_type', function (Blueprint $table) {
            if (!Schema::hasColumn('document_type', 'is_archived')) {
                $table->boolean('is_archived')->default(false)->after('access_id');
            }
            if (!Schema::hasColumn('document_type', 'archived_on')) {
                $table->timestamp('archived_on')->nullable()->after('is_archived');
            }
        });

        Schema::table('certificate_type', function (Blueprint $table) {
            if (!Schema::hasColumn('certificate_type', 'is_archived')) {
                $table->boolean('is_archived')->default(false)->after('access_id');
            }
            if (!Schema::hasColumn('certificate_type', 'archived_on')) {
                $table->timestamp('archived_on')->nullable()->after('is_archived');
            }
        });
    }

    public function down(): void
    {
        Schema::table('document_type', function (Blueprint $table) {
            if (Schema::hasColumn('document_type', 'archived_on')) {
                $table->dropColumn('archived_on');
            }
            if (Schema::hasColumn('document_type', 'is_archived')) {
                $table->dropColumn('is_archived');
            }
        });

        Schema::table('certificate_type', function (Blueprint $table) {
            if (Schema::hasColumn('certificate_type', 'archived_on')) {
                $table->dropColumn('archived_on');
            }
            if (Schema::hasColumn('certificate_type', 'is_archived')) {
                $table->dropColumn('is_archived');
            }
        });
    }
};
