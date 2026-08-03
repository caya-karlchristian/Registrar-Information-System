<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * pending_expires_at: set to now()+14 days whenever a SystemUser is
 * created with status 'Pending Activation' (both the direct-create path
 * in AdminUserService::create() and the access-request-approval path in
 * AccessRequestService::approve()). Cleared when the record activates
 * (Sso\UserProvisioningService::provision()). Consumed by
 * provisioning:expire-stale to flip anything past due to 'Expired'.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasColumn('users', 'pending_expires_at')) {
            return;
        }

        Schema::table('users', function (Blueprint $table) {
            $table->timestamp('pending_expires_at')->nullable()->after('status');
            $table->index(['status', 'pending_expires_at'], 'idx_users_status_pending_expiry');
        });
    }

    public function down(): void
    {
        if (!Schema::hasColumn('users', 'pending_expires_at')) {
            return;
        }

        Schema::table('users', function (Blueprint $table) {
            $table->dropIndex('idx_users_status_pending_expiry');
            $table->dropColumn('pending_expires_at');
        });
    }
};
