<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

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
 * We use raw DB::statement() here rather than Schema::table()->enum()
 * ->change() because altering an existing MySQL ENUM's value list via
 * Doctrine DBAL (which ->change() depends on) is unreliable — DBAL
 * doesn't model MySQL enums natively and can silently drop the
 * constraint or require doctrine/dbal type mapping workarounds. A raw
 * MODIFY COLUMN is the standard, dependable way to alter a MySQL enum
 * in place without touching existing row data.
 */
return new class extends Migration
{
    public function up(): void
    {
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
        DB::statement(
            "ALTER TABLE notification_types " .
            "MODIFY COLUMN audience " .
            "ENUM('student_alumni', 'admin', 'both', 'all') " .
            "NOT NULL DEFAULT 'student_alumni'"
        );
    }
};
