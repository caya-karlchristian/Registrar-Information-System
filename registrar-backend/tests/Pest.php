<?php

use App\Models\Policy;
use App\Models\SystemUser;

// ── Global test helpers shared across all Pest test files ────────────────────

uses(Tests\TestCase::class)->in('Feature', 'Unit');

/**
 * Attaches a policy granting full dashboard access (View, Process, Complete)
 * to the given user, if and only if they're an admin.
 *
 * Background: Work Item #1 (granular per-action permissions) split the
 * `dashboard` module from a single Access toggle into three actions —
 * View, Process, Complete — enforced both by the `module:dashboard,...`
 * route middleware (see routes/api.php) and, for PUT status changes, by
 * DocumentRequestService::authorizeStatusChange(). Around the same time,
 * Policy::DEFAULT_NAME (what an admin with no policy_id falls back to)
 * was hardened to a zero-access "No Access" policy — see that constant's
 * docblock for the security rationale.
 *
 * The combined effect: an admin SystemUser created without an explicit
 * policy_id now has NO dashboard access at all. Any feature test that
 * spins up an admin and exercises a dashboard-gated endpoint (viewing,
 * updating, or claiming a document request) needs an explicit policy
 * attached, or it will legitimately receive a 403 from the same
 * authorization path a real under-provisioned admin would hit in
 * production.
 *
 * Centralized here (rather than duplicated per test file) so the
 * definition of "a normally-provisioned admin, for test purposes" has
 * exactly one source of truth. Tests that specifically want to exercise
 * a *restricted* policy (e.g. PolicyModuleAccessTest's "Student Staff"
 * scenarios) should continue to build their own narrower Policy instead
 * of using this helper.
 *
 * Uses firstOrCreate() rather than create() because `policies.name` is
 * unique and this helper may be called more than once within the same
 * RefreshDatabase-backed test run.
 */
function grantFullDashboardAccess(SystemUser $user): SystemUser
{
    if ((int) $user->role_id !== SystemUser::ROLE_ADMIN) {
        return $user;
    }

    $policy = Policy::firstOrCreate(
        ['name' => 'Test Full Dashboard Access'],
        [
            'permissions' => ['dashboard' => ['View', 'Process', 'Complete']],
            'is_system'   => false,
        ]
    );

    $user->update(['policy_id' => $policy->policy_id]);

    return $user;
}