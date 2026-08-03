<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * Security fix: admins with no policy_id attached were silently falling
 * back to "Registrar Staff" (Policy::DEFAULT_NAME), which grants
 * Analytics + Logbook access. An admin created without an explicit
 * policy — whether via direct creation, an approved access request with
 * no policy selected, or a policy row getting deleted out from under
 * them (see PolicyService::delete()) — should get NOTHING until someone
 * deliberately grants them a policy. Fail closed, not fail open.
 *
 * This seeds a new is_system policy, "No Access", with every module key
 * present and empty (mirrors the shape SystemUser::effectivePermissions()
 * / hasModuleAccess() already expect — an empty array for a module is
 * "not granted", same as the key being absent entirely).
 * App\Models\Policy::DEFAULT_NAME is repointed at this row's name in the
 * same change (see that file).
 *
 * "Registrar Staff" itself is left untouched and still exists as a
 * normal, explicitly-assignable policy — this migration only changes
 * what an admin gets when NO policy is attached, not the Registrar
 * Staff policy's own permissions.
 *
 * Written idempotently (insertOrIgnore), matching the rest of this
 * batch — safe to re-run from any partial state.
 */
return new class extends Migration
{
    public const ZERO_ACCESS_POLICY_NAME = 'No Access';

    public function up(): void
    {
        DB::table('policies')->insertOrIgnore([
            [
                'name'        => self::ZERO_ACCESS_POLICY_NAME,
                'permissions' => json_encode([
                    'dashboard'        => [],
                    'inbox'            => [],
                    'analytics'        => [],
                    'logbook'          => [],
                    'profile'          => [],
                    'access_requests'  => [],
                ]),
                'is_system'   => true,
                'created_at'  => now(),
                'updated_at'  => now(),
            ],
        ]);
    }

    public function down(): void
    {
        // Only safe to remove if nothing is actually relying on it as a
        // fallback anymore. Any admin currently resolving to this policy
        // (policy_id IS NULL) is put back to explicitly pointing at it
        // first, so dropping the row can't silently flip them to
        // whatever DEFAULT_NAME resolves to after a rollback.
        $policy = DB::table('policies')->where('name', self::ZERO_ACCESS_POLICY_NAME)->first();

        if ($policy) {
            DB::table('policies')->where('policy_id', $policy->policy_id)->delete();
        }
    }
};
