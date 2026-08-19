<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Work Item #2 — Admin Management Consolidation.
 *
 * Documents (via a column comment) that users.policy_id is no longer an
 * editable field from any UI surface as of this migration. It is NOT
 * dropped, made nullable-only, or otherwise altered structurally —
 * dropping it would break SystemUser::assumedPolicyId()'s fallback read
 * path (see its docblock: it reads this raw column whenever the current
 * session has no active_role_assignment_id override, which is the
 * common case for any admin who has never called POST /auth/switch-role).
 *
 * Going forward, this column is written to in exactly two places:
 *   1. AdminUserService::create() — seeds the column at account creation,
 *      before any role_assignments row exists for the new account (the
 *      first row is created on that account's first successful SSO
 *      login — see UserProvisioningService::ensureBaselineRoleAssignment()).
 *   2. RoleAssignmentService::editPolicy() — keeps this column in sync
 *      whenever a Super Admin edits the policy on a user's BASELINE
 *      Admin role_assignment (the row whose role_id matches the user's
 *      own primary role_id), mirroring the sync PolicyService::
 *      attachToUser() used to perform in the other direction before it
 *      was retired.
 *
 * No other code path writes it: PATCH /system-users/{id}/policy ("Manage
 * Access") is removed, and PUT /system-users/{id} ("Edit User") no
 * longer accepts role_id (which used to indirectly interact with policy
 * resolution) — see UpdateSystemUserRequest and AdminUserService::update().
 *
 * See the accompanying data-migration plan (delivered alongside this
 * work item) for the one-time reconciliation query that should be run
 * in each environment BEFORE this ships, to surface and resolve any
 * users.policy_id / role_assignments.policy_id pairs that had already
 * drifted apart under the old three-surface system.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasColumn('users', 'policy_id')) {
            return;
        }

        // MySQL requires the full column definition to change a comment
        // — this repeats users.policy_id's existing definition
        // (unsignedInteger, nullable) unchanged, only adding the
        // deprecation note. No data is touched by this migration.
        Schema::table('users', function (Blueprint $table) {
            $table->unsignedInteger('policy_id')
                ->nullable()
                ->comment(
                    'DEPRECATED as of Work Item #2 (2026-08-23): no longer written by any UI-editable path. '
                    . 'Kept as a read-only mirror for SystemUser::assumedPolicyId()\'s no-session-override '
                    . 'fallback. Source of truth is role_assignments — see RoleAssignmentService::grant()/'
                    . 'editPolicy(). Do not add new direct writers of this column.'
                )
                ->change();
        });
    }

    public function down(): void
    {
        if (!Schema::hasColumn('users', 'policy_id')) {
            return;
        }

        Schema::table('users', function (Blueprint $table) {
            $table->unsignedInteger('policy_id')
                ->nullable()
                ->comment(null)
                ->change();
        });
    }
};
