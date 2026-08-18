<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * Work Item #1 — Granular Per-Action Permissions.
 *
 * Converts every existing policy row's `dashboard` and `logbook`
 * permission values from the old single-token shape (`["Access"]` or
 * `[]`) to the new granular, per-action shape:
 *
 *   dashboard => subset of ["View", "Process", "Complete"]
 *   logbook   => subset of ["View", "Export"]
 *
 * (See App\Models\Policy::MODULE_ACTIONS — the single source of truth
 * this migration's target values are drawn from.)
 *
 * This runs against a LIVE, already-seeded production database, not a
 * fresh reseed, so it has to reason about whatever value is actually
 * sitting in each row's `permissions` JSON column today rather than
 * assuming it matches any one seeder/migration's history. Two prior
 * sources have disagreed on exactly what "Registrar Staff" /
 * "Student Staff" grant at various points (see
 * 2026_07_11_000001_create_policies_table.php's original seed vs.
 * DatabaseSeeder::seedPolicies()'s dev override) — this migration does
 * not try to reconcile that history. It instead applies one
 * deterministic rule set, keyed off the two things that actually
 * matter for a safe production rollout:
 *
 *   1. The two named system policies ("Registrar Staff", "Student
 *      Staff") are set EXPLICITLY to their spec'd target shape,
 *      regardless of whatever they currently hold. This is what the
 *      corrected Work Item #1 scope defines as correct for these two
 *      roles, and matches the Definition of Done's "Registrar Staff /
 *      existing Admin policies behave exactly as before — full range
 *      unaffected" (full access) and the new Student Staff
 *      restriction (View + Complete only).
 *
 *   2. Every OTHER policy (any custom policy a super admin created
 *      through the UI) is upgraded conservatively: if its dashboard or
 *      logbook value currently contains the legacy "Access" token,
 *      that token is replaced with the FULL granular action list for
 *      that module — i.e. an admin who could previously do everything
 *      on that module still can. A policy that had NO access
 *      (empty array or key absent) is left exactly as it was — no
 *      access before, no access after. This is what keeps the
 *      migration additive/safe rather than silently downgrading a
 *      real admin's access the moment this deploys: without this
 *      step, any custom policy still holding the legacy `["Access"]`
 *      token would fail every granular hasModuleAccess($module,
 *      $action) check post-deploy (since "Access" matches none of
 *      View/Process/Complete/Export), which would be a silent access
 *      regression, not a fix.
 *
 * Idempotent: safe to re-run from any partial state. The two named
 * policies are always reset to the same target values (a no-op on
 * repeat runs); other policies only change while they still hold the
 * legacy "Access" token, which this migration itself removes on first
 * run — so a second run finds nothing left to convert.
 */
return new class extends Migration
{
    private const REGISTRAR_STAFF_NAME = 'Registrar Staff';
    private const STUDENT_STAFF_NAME   = 'Student Staff';

    private const DASHBOARD_FULL = ['View', 'Process', 'Complete'];
    private const DASHBOARD_STUDENT_STAFF = ['View', 'Complete'];

    private const LOGBOOK_FULL = ['View', 'Export'];
    private const LOGBOOK_STUDENT_STAFF = ['View'];

    public function up(): void
    {
        DB::table('policies')->orderBy('policy_id')->get()->each(function ($row) {
            $permissions = json_decode($row->permissions ?? '[]', true) ?? [];
            $original = $permissions;

            if ($row->name === self::STUDENT_STAFF_NAME) {
                // Explicit target shape for the restricted role — never
                // derived from whatever "Access"/[] happened to be
                // sitting there, since a blind "Access" -> full mapping
                // would incorrectly grant Student Staff the Process
                // action it must NOT have.
                if (array_key_exists('dashboard', $permissions)) {
                    $permissions['dashboard'] = self::DASHBOARD_STUDENT_STAFF;
                }
                if (array_key_exists('logbook', $permissions)) {
                    $permissions['logbook'] = self::LOGBOOK_STUDENT_STAFF;
                }
            } elseif ($row->name === self::REGISTRAR_STAFF_NAME) {
                // Explicit target shape for full staff — set outright
                // rather than conditioned on the current value so this
                // policy ends up correct regardless of which historical
                // seed path (migration vs. DatabaseSeeder) produced the
                // row it's converting.
                if (array_key_exists('dashboard', $permissions)) {
                    $permissions['dashboard'] = self::DASHBOARD_FULL;
                }
                if (array_key_exists('logbook', $permissions)) {
                    $permissions['logbook'] = self::LOGBOOK_FULL;
                }
            } else {
                // Any other (custom, super-admin-created) policy:
                // upgrade the legacy "Access" token to the equivalent
                // full granular list, module by module. Anything that
                // wasn't granting "Access" (empty, absent, or already
                // granular from a prior partial run) is left untouched.
                if (
                    array_key_exists('dashboard', $permissions) &&
                    is_array($permissions['dashboard']) &&
                    in_array('Access', $permissions['dashboard'], true)
                ) {
                    $permissions['dashboard'] = self::DASHBOARD_FULL;
                }

                if (
                    array_key_exists('logbook', $permissions) &&
                    is_array($permissions['logbook']) &&
                    in_array('Access', $permissions['logbook'], true)
                ) {
                    $permissions['logbook'] = self::LOGBOOK_FULL;
                }
            }

            if ($permissions === $original) {
                return; // nothing to write — keeps this idempotent and cheap on repeat runs
            }

            DB::table('policies')
                ->where('policy_id', $row->policy_id)
                ->update([
                    'permissions' => json_encode($permissions),
                    'updated_at'  => now(),
                ]);
        });
    }

    /**
     * Best-effort rollback: collapses any non-empty granular
     * dashboard/logbook value back to the legacy ["Access"] token,
     * leaving empty values empty. This restores pre-migration SINGLE-
     * TOKEN SEMANTICS for every policy, but cannot losslessly restore
     * Student Staff's original pre-migration dashboard/logbook values
     * specifically (that exact prior state isn't recoverable — see
     * this file's class docblock re: two disagreeing historical
     * sources). Acceptable for a rollback path: it returns the system
     * to a consistent, working pre-Work-Item-#1 state, not to a
     * byte-for-byte historical snapshot.
     */
    public function down(): void
    {
        DB::table('policies')->orderBy('policy_id')->get()->each(function ($row) {
            $permissions = json_decode($row->permissions ?? '[]', true) ?? [];
            $original = $permissions;

            foreach (['dashboard', 'logbook'] as $module) {
                if (
                    array_key_exists($module, $permissions) &&
                    is_array($permissions[$module]) &&
                    !empty($permissions[$module])
                ) {
                    $permissions[$module] = ['Access'];
                }
            }

            if ($permissions === $original) {
                return;
            }

            DB::table('policies')
                ->where('policy_id', $row->policy_id)
                ->update([
                    'permissions' => json_encode($permissions),
                    'updated_at'  => now(),
                ]);
        });
    }
};
