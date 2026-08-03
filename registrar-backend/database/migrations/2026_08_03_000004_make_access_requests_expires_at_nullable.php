<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * access_requests.expires_at was created NOT NULL, but
 * AccessRequestService::approve()/reject() both set it to null once a
 * request leaves the 'Requested' state (per the column's own migration
 * comment: "cleared on Approve/Reject"). That mismatch throws
 * SQLSTATE[23000]: Column 'expires_at' cannot be null on every
 * approve/reject call. Making the column nullable is the correct fix —
 * the code's intent (no expiry once a request is no longer pending) was
 * always right; the schema just never allowed it.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('access_requests', function (Blueprint $table) {
            $table->timestamp('expires_at')->nullable()->change();
        });
    }

    public function down(): void
    {
        // Backfill any nulls before re-tightening the constraint so the
        // rollback itself doesn't fail on existing Approved/Rejected/
        // Fulfilled rows.
        Schema::table('access_requests', function (Blueprint $table) {
            \DB::table('access_requests')
                ->whereNull('expires_at')
                ->update(['expires_at' => now()]);
        });

        Schema::table('access_requests', function (Blueprint $table) {
            $table->timestamp('expires_at')->nullable(false)->change();
        });
    }
};
