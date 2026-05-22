<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Adds local_auth_enabled flag to users.
 *
 * The password column already exists and is populated for admin accounts.
 * This flag tracks which accounts have had a local password explicitly set
 * so the admin panel can show their local-auth status at a glance.
 *
 * Default 0 = local auth not yet enabled (IDP-only until set).
 * Set to 1 via:
 *   • POST /api/auth/local-password  (superadmin API)
 *   • php artisan auth:seed-local-passwords  (Artisan helper)
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            if (!Schema::hasColumn('users', 'local_auth_enabled')) {
                $table->tinyInteger('local_auth_enabled')
                      ->default(0)
                      ->after('password')
                      ->comment('1 = local bcrypt password has been set and may be used as IDP fallback');
            }
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            if (Schema::hasColumn('users', 'local_auth_enabled')) {
                $table->dropColumn('local_auth_enabled');
            }
        });
    }
};
