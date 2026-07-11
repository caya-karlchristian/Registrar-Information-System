<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * User Management — Policy Attachment (admins only).
 *
 * The frontend (PolicyManagement.jsx, UserManagement.jsx, PolicyModal.jsx)
 * has always shipped a "create policy" / "attach policy to admin" UI, but it
 * only ever read and wrote `localStorage` (`ris_system_policies`,
 * `ris_user_policies`). Nothing was persisted server-side and nothing was
 * enforced — every browser / device saw a different set of policies, and a
 * policy "attached" to an admin was purely cosmetic.
 *
 * This migration adds real, relational storage:
 *   - `policies`      — reusable named sets of module permissions.
 *   - `users.policy_id` — the single policy currently attached to an admin
 *                         (role_id = 3). Nullable: a NULL policy_id means
 *                         "no policy attached yet" and is resolved to a
 *                         sensible default in the application layer
 *                         (see PolicyService::DEFAULT_POLICY_NAME).
 *                         Super admins (role_id = 4) never read this column —
 *                         they always have full, unrestricted access.
 *
 * The two policies the frontend previously hardcoded as `DEFAULT_POLICIES`
 * ("Registrar Staff", "Student Staff") are seeded here as `is_system = true`
 * rows so behaviour is identical on a fresh install. `is_system` policies
 * can be edited but not deleted (enforced in PolicyService), matching the
 * "System managed" vs "Custom policy" distinction already drawn in the UI.
 *
 * Written idempotently (Schema::hasTable / hasColumn / insertOrIgnore),
 * matching the style of the other migrations in this batch — safe to
 * re-run from any partial state.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('policies')) {
            Schema::create('policies', function (Blueprint $table) {
                $table->increments('policy_id');
                $table->string('name', 100)->unique();
                // Module → actions map, e.g. {"dashboard":["Access"],"inbox":[]}.
                // Kept as a flexible JSON blob rather than a normalized
                // permissions table since the module list is small and owned
                // entirely by the frontend's MODULE_OPTIONS constant.
                $table->json('permissions')->nullable();
                $table->boolean('is_system')->default(false);
                $table->timestamps();
            });
        }

        if (!Schema::hasColumn('users', 'policy_id')) {
            Schema::table('users', function (Blueprint $table) {
                $table->unsignedInteger('policy_id')->nullable()->after('role_id');
            });
        }

        // Add the FK separately (and defensively) so this migration can be
        // re-run safely even if the column exists but the constraint was
        // never attached (e.g. a partially-applied previous run).
        if (!$this->hasForeignKey('users', 'fk_users_policy')) {
            Schema::table('users', function (Blueprint $table) {
                $table->foreign('policy_id', 'fk_users_policy')
                    ->references('policy_id')->on('policies')
                    ->onDelete('set null')
                    ->onUpdate('cascade');
            });
        }

        // Seed the two system-managed default policies used by the
        // pre-existing frontend mock, so upgrading installs keep the same
        // defaults their admins already saw.
        DB::table('policies')->insertOrIgnore([
            [
                'name'        => 'Registrar Staff',
                'permissions' => json_encode([
                    'dashboard' => [],
                    'inbox'     => [],
                    'analytics' => ['Access'],
                    'logbook'   => ['Access'],
                    'profile'   => [],
                ]),
                'is_system'   => true,
                'created_at'  => now(),
                'updated_at'  => now(),
            ],
            [
                'name'        => 'Student Staff',
                'permissions' => json_encode([
                    'dashboard' => ['Access'],
                    'inbox'     => ['Access'],
                    'analytics' => [],
                    'logbook'   => [],
                    'profile'   => [],
                ]),
                'is_system'   => true,
                'created_at'  => now(),
                'updated_at'  => now(),
            ],
        ]);
    }

    public function down(): void
    {
        if (Schema::hasColumn('users', 'policy_id')) {
            Schema::table('users', function (Blueprint $table) {
                if ($this->hasForeignKey('users', 'fk_users_policy')) {
                    $table->dropForeign('fk_users_policy');
                }
                $table->dropColumn('policy_id');
            });
        }

        Schema::dropIfExists('policies');
    }

    /**
     * Portable "does this FK constraint already exist" check.
     * information_schema works the same way whether the connection is
     * MySQL/MariaDB (this project's DB — see docker-compose.yml), so this
     * avoids depending on doctrine/dbal just to inspect one constraint.
     */
    private function hasForeignKey(string $table, string $constraintName): bool
    {
        $database = DB::getDatabaseName();

        $result = DB::selectOne(
            'SELECT COUNT(*) AS count
             FROM information_schema.TABLE_CONSTRAINTS
             WHERE CONSTRAINT_SCHEMA = ?
               AND TABLE_NAME = ?
               AND CONSTRAINT_NAME = ?
               AND CONSTRAINT_TYPE = "FOREIGN KEY"',
            [$database, $table, $constraintName]
        );

        return $result && $result->count > 0;
    }
};
