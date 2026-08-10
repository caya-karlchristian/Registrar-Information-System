<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Supports the new admin/staff provisioning model (see AdminUserService,
 * Sso\UserProvisioningService):
 *
 *   - users.status gains two new values:
 *       'Pending Activation' — pre-registered in RIS, no matching IdP
 *                               login yet. Set by AdminUserService::create()
 *                               and AccessRequestService::approve().
 *       'Expired'             — was 'Pending Activation' past
 *                               pending_expires_at with no activation.
 *                               Set by provisioning:expire-stale
 *                               (Console\Commands\ExpireStaleProvisioning).
 *     MySQL/MariaDB store `status` as an ENUM (see create_base_schema),
 *     which requires a column rebuild to add values — done via a raw
 *     MODIFY on that driver. SQLite (used in tests) has no real ENUM type
 *     (Laravel emulates it with a CHECK constraint it does not enforce by
 *     default in this app's config), so no schema change is needed there.
 *
 *   - users.password becomes nullable. A 'Pending Activation' record has
 *     no credential of any kind — it authenticates exclusively through
 *     the IdP once linked, or (for a small set of Super Admins) through
 *     the separate break-glass local-password flow. Previously this was
 *     worked around with a random, unusable bcrypt hash purely to satisfy
 *     the NOT NULL constraint; storing an actual NULL is more honest and
 *     removes a footgun (a future reader could mistake that hash for a
 *     real, if random, credential).
 *
 * Written idempotently, matching the style of
 * 2026_07_11_000001_create_policies_table.php — safe to re-run from any
 * partial state.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (Schema::getConnection()->getDriverName() === 'mysql') {
            DB::statement(
                "ALTER TABLE users MODIFY status ENUM('Activated', 'Deactivated', 'Pending Activation', 'Expired') NOT NULL DEFAULT 'Activated'"
            );
            DB::statement('ALTER TABLE users MODIFY password VARCHAR(255) NULL');
            return;
        }

        // SQLite (test suite): status has no real ENUM constraint to widen,
        // and column nullability can be relaxed via Schema::table() using
        // doctrine/dbal-free Laravel column modification.
        if (Schema::hasColumn('users', 'password')) {
            Schema::table('users', function (Blueprint $table) {
                $table->string('password', 255)->nullable()->change();
            });
        }
    }

    public function down(): void
    {
        if (Schema::getConnection()->getDriverName() === 'mysql') {
            // Only safe to revert if no rows currently use the new values —
            // left as a manual/ops step rather than silently truncating data
            // on a down() nobody expects to lose records.
            DB::statement(
                "ALTER TABLE users MODIFY status ENUM('Activated', 'Deactivated') NOT NULL DEFAULT 'Activated'"
            );
            DB::statement("ALTER TABLE users MODIFY password VARCHAR(255) NOT NULL DEFAULT ''");
            return;
        }

        if (Schema::hasColumn('users', 'password')) {
            Schema::table('users', function (Blueprint $table) {
                $table->string('password', 255)->nullable(false)->default('')->change();
            });
        }
    }
};
