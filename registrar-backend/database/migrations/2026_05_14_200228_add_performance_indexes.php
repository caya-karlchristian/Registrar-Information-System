<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Add performance indexes to document_request and request_document.
 *
 * Why these indexes?
 *
 *  document_request.requested_at  — analytics queries filter by date range;
 *                                   without this every analytics call is a full-table scan.
 *  document_request.status_id     — staff dashboard filters by status constantly.
 *  document_request.user_id       — students/alumni fetch "my requests"; essential for
 *                                   per-user queries to stay fast as row count grows.
 *  request_document composite     — analytics byDocumentType() JOINs on both columns;
 *                                   a composite index covers the JOIN and GROUP BY in one pass.
 *
 * Fix (2026-05-14): replaced getDoctrineSchemaManager() (removed in Laravel 11)
 * with Schema::hasIndex(), which is the native Laravel 11+ equivalent.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('document_request', function (Blueprint $table) {
            // Skip if already indexed (safe to re-run on any environment)
            if (!Schema::hasIndex('document_request', 'dr_requested_at_idx')) {
                $table->index('requested_at', 'dr_requested_at_idx');
            }
            if (!Schema::hasIndex('document_request', 'dr_status_id_idx')) {
                $table->index('status_id', 'dr_status_id_idx');
            }
            if (!Schema::hasIndex('document_request', 'dr_user_id_idx')) {
                $table->index('user_id', 'dr_user_id_idx');
            }
        });

        Schema::table('request_document', function (Blueprint $table) {
            if (!Schema::hasIndex('request_document', 'rd_request_doctype_idx')) {
                // Composite index covers the JOIN and GROUP BY in byDocumentType()
                $table->index(['request_id', 'document_type_id'], 'rd_request_doctype_idx');
            }
        });
    }

    public function down(): void
    {
        Schema::table('document_request', function (Blueprint $table) {
            $table->dropIndexIfExists('dr_requested_at_idx');
            $table->dropIndexIfExists('dr_status_id_idx');
            $table->dropIndexIfExists('dr_user_id_idx');
        });

        Schema::table('request_document', function (Blueprint $table) {
            $table->dropIndexIfExists('rd_request_doctype_idx');
        });
    }
};