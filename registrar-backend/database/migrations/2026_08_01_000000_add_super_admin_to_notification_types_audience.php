<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Adds 'super_admin' as a valid value of notification_types.audience.
 *
 * Root cause: the column was created as a MySQL ENUM restricted to
 * ['student_alumni', 'admin', 'both', 'all']. The break-glass-access
 * seeder (DatabaseSeeder::seedNotificationTypes(), notification_type_id
 * 20) inserts 'super_admin', which isn't in that list. MySQL doesn't
 * reject the invalid value outright — it truncates the column to an
 * empty string and raises warning 1265, which surfaces as a hard
 * QueryException under strict mode, aborting `php artisan db:seed`.
 *
 * We use raw DB::statement() for MySQL rather than Schema::table()->enum()
 * ->change() because altering an existing MySQL ENUM's value list via
 * Doctrine DBAL (which ->change() depends on) is unreliable — DBAL
 * doesn't model MySQL enums natively and can silently drop the
 * constraint or require doctrine/dbal type mapping workarounds. A raw
 * MODIFY COLUMN is the standard, dependable way to alter a MySQL enum
 * in place without touching existing row data.
 *
 * SQLite (used by the test suite, see phpunit.xml DB_CONNECTION=sqlite)
 * has no ENUM type at all — Schema::enum() compiles it to a TEXT column
 * with a CHECK constraint instead, and SQLite has no ALTER COLUMN /
 * MODIFY COLUMN support, so the MySQL statement above is a syntax error
 * there. Since TestCase::$seed = true runs DatabaseSeeder (which inserts
 * the 'super_admin' row) before every test, the CHECK constraint itself
 * has to widen too, not just avoid the crash. Schema::table()->enum()
 * ->change() (backed by doctrine/dbal, already a project dependency)
 * rebuilds the underlying table with the new CHECK constraint, which is
 * the standard portable way to do this on SQLite.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (Schema::getConnection()->getDriverName() === 'sqlite') {
            Schema::table('notification_types', function (Blueprint $table) {
                $table->enum('audience', ['student_alumni', 'admin', 'both', 'all', 'super_admin'])
                    ->default('student_alumni')
                    ->change();
            });
            return;
        }

        DB::statement(
            "ALTER TABLE notification_types " .
            "MODIFY COLUMN audience " .
            "ENUM('student_alumni', 'admin', 'both', 'all', 'super_admin') " .
            "NOT NULL DEFAULT 'student_alumni'"
        );
    }

    public function down(): void
    {
        // Reverting drops 'super_admin' back out of the allowed set.
        // Any row already using it (e.g. notification_type_id 20) would
        // fail to migrate down under strict mode — clean those up first
        // if you ever need to roll this back.
        if (Schema::getConnection()->getDriverName() === 'sqlite') {
            Schema::table('notification_types', function (Blueprint $table) {
                $table->enum('audience', ['student_alumni', 'admin', 'both', 'all'])
                    ->default('student_alumni')
                    ->change();
            });
            return;
        }

        DB::statement(
            "ALTER TABLE notification_types " .
            "MODIFY COLUMN audience " .
            "ENUM('student_alumni', 'admin', 'both', 'all') " .
            "NOT NULL DEFAULT 'student_alumni'"
        );
    }
};