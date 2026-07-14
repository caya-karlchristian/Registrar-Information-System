<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * audit_logs previously had one identity slot (user_id/email/role_name),
 * which every caller implicitly treated as "the actor." That held for
 * login/logout/policy actions, but AdminUserService::create()/update()
 * were passing the *target* admin instead — meaning admin_created /
 * admin_updated entries recorded the new/edited account's own identity
 * rather than which superadmin performed the action.
 *
 * This adds a second, explicit identity slot for the target, plus a
 * general-purpose metadata column — LocalAuthController::setPassword()
 * was already calling AuditLogger::log() with a 4th metadata argument
 * that the old signature silently dropped.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('audit_logs', function (Blueprint $table) {
            $table->integer('target_user_id')->nullable()->after('user_id');
            $table->string('target_email', 100)->nullable()->after('email');
            $table->json('metadata')->nullable()->after('ip_address');

            $table->index('target_user_id', 'fk_audit_logs_target_user');

            $table->foreign('target_user_id', 'fk_audit_logs_target_user')
                ->references('user_id')->on('users')
                ->onDelete('set null');
        });
    }

    public function down(): void
    {
        Schema::table('audit_logs', function (Blueprint $table) {
            $table->dropForeign('fk_audit_logs_target_user');
            $table->dropIndex('fk_audit_logs_target_user');
            $table->dropColumn(['target_user_id', 'target_email', 'metadata']);
        });
    }
};
