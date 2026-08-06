<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Splits "identity" (users) from "role/entitlement" (role_assignments) so
 * one person can hold more than one role concurrently — e.g. a student who
 * is also a policy-restricted admin ("student staff"), or a super admin
 * previewing as admin. users.role_id / users.policy_id remain in place as
 * the primary/default role for anything not yet migrated to read from
 * here (see the 2026_08_10_000001 backfill migration) — this table is
 * additive, not a replacement, until the read paths (SystemUser helpers,
 * EnsureModuleAccess, the frontend switcher) are migrated over.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('role_assignments')) {
            return;
        }

        Schema::create('role_assignments', function (Blueprint $table) {
            $table->id();

            $table->integer('user_id');
            $table->foreign('user_id')->references('user_id')->on('users')->cascadeOnDelete();

            // Matches SystemUser::ROLE_STUDENT (1) / ROLE_ALUMNI (2) /
            // ROLE_ADMIN (3) / ROLE_SUPER_ADMIN (4).
            $table->tinyInteger('role_id');

            // Only meaningful when role_id = ROLE_ADMIN, same convention
            // as users.policy_id / access_requests.requested_policy_id.
            $table->unsignedInteger('policy_id')->nullable();
            $table->foreign('policy_id')->references('policy_id')->on('policies')->nullOnDelete();

            $table->string('status')->default('Active');
            // 'Active' | 'Expired' | 'Revoked'

            $table->integer('granted_by')->nullable();
            $table->foreign('granted_by')->references('user_id')->on('users')->nullOnDelete();
            $table->timestamp('granted_at')->nullable();

            // Null = indefinite (grandfathered accounts via the backfill
            // migration). New grants of a secondary role (e.g. the admin
            // side of a student-staff assignment) should set this —
            // principle-of-least-duration, same reasoning as the 7-day
            // access_requests.expires_at and 14-day
            // users.pending_expires_at. Swept by role-assignments:expire.
            $table->timestamp('expires_at')->nullable();

            $table->integer('revoked_by')->nullable();
            $table->foreign('revoked_by')->references('user_id')->on('users')->nullOnDelete();
            $table->timestamp('revoked_at')->nullable();
            $table->text('revocation_reason')->nullable();

            $table->timestamps();

            // A user should not hold two simultaneous Active assignments
            // for the same role — partial uniqueness enforced at the
            // application layer in RoleAssignmentService::grant() (MySQL
            // has no native partial unique index without a generated
            // column, and adding one here would be more machinery than
            // this needs given grant() already runs inside a transaction).
            $table->index(['user_id', 'status']);
            $table->index(['status', 'expires_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('role_assignments');
    }
};
