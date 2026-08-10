<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Step 3 of Multi-Role Assignments: gives each Sanctum token (RIS has no
 * separate `sessions` table — the personal-access-token *is* the session,
 * see AuthController::login()'s `token` cookie) a slot to record which
 * held role_assignments row the session is currently "assumed as."
 *
 * Why a column on the token, not a column on users:
 *   - A user can hold Student + Admin simultaneously; "which one is this
 *     particular browser session acting as right now" is a property of
 *     the SESSION, not the account. Putting it on `users` would make
 *     switching role on one tab silently switch it everywhere.
 *   - RIS already treats login as single-session-per-account (see
 *     AuthController::login() / LocalAuthController::login(), both call
 *     $user->tokens()->delete() before issuing a new one), so in
 *     practice there is only ever one token to update — but scoping the
 *     column to the token rather than the user keeps that an
 *     implementation detail RoleAssignmentService::switchTo() can rely
 *     on, not a hidden assumption baked into the schema.
 *
 * Null = "no override, use users.role_id/policy_id as-is" — this is the
 * state of every token that existed before this migration and every
 * token issued by a plain login going forward, so nothing here changes
 * default behavior. See SystemUser::assumedRoleId()/assumedPolicyId().
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('personal_access_tokens', function (Blueprint $table) {
            if (Schema::hasColumn('personal_access_tokens', 'active_role_assignment_id')) {
                return;
            }

            $table->unsignedBigInteger('active_role_assignment_id')->nullable()->after('abilities');
            $table->foreign('active_role_assignment_id')
                ->references('id')->on('role_assignments')
                ->nullOnDelete();
            $table->index('active_role_assignment_id');
        });
    }

    public function down(): void
    {
        Schema::table('personal_access_tokens', function (Blueprint $table) {
            if (!Schema::hasColumn('personal_access_tokens', 'active_role_assignment_id')) {
                return;
            }

            $table->dropForeign(['active_role_assignment_id']);
            $table->dropColumn('active_role_assignment_id');
        });
    }
};
