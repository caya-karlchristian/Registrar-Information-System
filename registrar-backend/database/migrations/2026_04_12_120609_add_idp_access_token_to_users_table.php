<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
{
    if (!Schema::hasColumn('users', 'idp_access_token')) {
        Schema::table('users', function (Blueprint $table) {
            $table->text('idp_access_token')->nullable()->after('idp_user_id');
        });
    }
}

public function down(): void
{
    Schema::table('users', function (Blueprint $table) {
        $table->dropColumn('idp_access_token');
    });
}
};
