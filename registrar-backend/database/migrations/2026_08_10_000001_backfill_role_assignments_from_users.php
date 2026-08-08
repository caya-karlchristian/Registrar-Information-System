<?php

use App\Models\SystemUser;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * One-time backfill: give every existing users row a matching Active
 * role_assignments row, so role_assignments is a complete picture of
 * "who holds what role" from day one — not just new grants going
 * forward. Grandfathered in with expires_at = null (indefinite) rather
 * than retroactively forcing an expiry on accounts nobody asked to
 * time-box; new secondary-role grants (e.g. the admin side of a
 * student-staff assignment) go through RoleAssignmentService::grant(),
 * which sets a real expires_at by default.
 *
 * Idempotent: skipped entirely if role_assignments already has rows,
 * so re-running (or running after a manual grant already happened)
 * never double-inserts.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (DB::table('role_assignments')->exists()) {
            return;
        }

        $now = now();

        SystemUser::query()
            ->select(['user_id', 'role_id', 'policy_id'])
            ->orderBy('user_id')
            ->chunkById(500, function ($users) use ($now) {
                $rows = $users->map(fn ($user) => [
                    'user_id'     => $user->user_id,
                    'role_id'     => $user->role_id,
                    'policy_id'   => $user->role_id === SystemUser::ROLE_ADMIN
                        ? $user->policy_id
                        : null,
                    'status'      => 'Active',
                    'granted_by'  => null, // pre-existing — no grantor to attribute
                    'granted_at'  => $now,
                    'expires_at'  => null, // indefinite — grandfathered
                    'created_at'  => $now,
                    'updated_at'  => $now,
                ])->all();

                DB::table('role_assignments')->insert($rows);
            }, 'user_id');
    }

    public function down(): void
    {
        // Deliberately not truncating role_assignments here — by the time
        // anyone rolls this back, real grant()/revoke() activity may have
        // happened on top of the backfilled rows, and blowing those away
        // would destroy real audit-relevant data, not just undo the seed.
        // Roll back the create_role_assignments_table migration itself
        // (which does drop the table) if a full undo is really needed.
    }
};
