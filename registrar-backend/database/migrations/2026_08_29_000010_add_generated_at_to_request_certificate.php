<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Adds a real, persisted "has this certificate actually been
 * generated/printed" signal to request_certificate.
 *
 * WHY THIS EXISTS — both of the two existing "certificate must be
 * generated before ReadyToClaim" guards were no-ops:
 *
 *   - DocumentRequestService::updateRequest() checked
 *     whereNotNull('certificate_type_id') across the request's
 *     certificate rows.
 *   - RequestItemStatusService::guardCertificateGenerated() checked
 *     $item->certificate_type_id === null on a single row.
 *
 * certificate_type_id is a NON-NULLABLE column set once, at request
 * creation (see DocumentRequestService::createRequest()) — it is
 * never null by the time staff can act on the item, so neither check
 * could ever actually block anything. The only place a "has this been
 * printed" signal genuinely existed was printedCertificateIds in
 * useStaffDashboard.js — held in browser localStorage, never sent to
 * the server, never persisted, and not shared across staff devices or
 * survivable across a cleared cache.
 *
 * generated_at (nullable timestamp) is the real signal going forward:
 * null = not yet generated, set = generated, with the timestamp itself
 * a free audit trail of when. Both guards are updated in the same
 * change set as this migration to read this column instead — see
 * DocumentRequestService::updateRequest() and
 * RequestItemStatusService::guardCertificateGenerated().
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('request_certificate', function (Blueprint $table) {
            if (!Schema::hasColumn('request_certificate', 'generated_at')) {
                $table->timestamp('generated_at')->nullable()->after('status_id');
            }
        });
    }

    public function down(): void
    {
        Schema::table('request_certificate', function (Blueprint $table) {
            if (Schema::hasColumn('request_certificate', 'generated_at')) {
                $table->dropColumn('generated_at');
            }
        });
    }
};
