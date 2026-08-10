<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Self-service access requests: delegated intake (any admin with the
 * access_requests module can submit one), centralized approval (Super
 * Admin only — see AccessRequestService::approve()/reject()).
 */
return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('access_requests')) {
            return;
        }

        Schema::create('access_requests', function (Blueprint $table) {
            $table->id();

            $table->integer('requested_by');
            $table->foreign('requested_by')->references('user_id')->on('users')->restrictOnDelete();

            $table->string('target_email');
            $table->string('target_first_name');
            $table->string('target_last_name');

            // Matches SystemUser::ROLE_ADMIN (3) / ROLE_SUPER_ADMIN (4).
            $table->tinyInteger('requested_role_id');

            $table->unsignedInteger('requested_policy_id')->nullable();
            $table->foreign('requested_policy_id')->references('policy_id')->on('policies')->nullOnDelete();

            $table->text('justification');

            $table->string('status')->default('Requested');
            // 'Requested' | 'Approved' | 'Rejected' | 'Fulfilled' | 'Expired'

            $table->integer('reviewed_by')->nullable();
            $table->foreign('reviewed_by')->references('user_id')->on('users')->nullOnDelete();
            $table->timestamp('reviewed_at')->nullable();

            // Populated on Reject only. Kept as a first-class column (not
            // just an audit-log metadata field) so the Access Requests
            // queue view can display it directly without parsing JSON.
            $table->text('rejection_reason')->nullable();

            $table->integer('fulfilled_user_id')->nullable();
            $table->foreign('fulfilled_user_id')->references('user_id')->on('users')->nullOnDelete();

            // 7 days from creation; cleared on Approve/Reject. Anything
            // still 'Requested' past this is flipped to 'Expired' by
            // provisioning:expire-stale.
            $table->timestamp('expires_at');

            $table->timestamps();

            $table->index('status');
            $table->index(['status', 'expires_at']);
            $table->index('target_email');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('access_requests');
    }
};