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
        Schema::table('system_user', function (Blueprint $table) {
            $table->string('email')->nullable()->after('role_id');
            $table->string('password')->nullable()->after('email');
            $table->rememberToken();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('system_user', function (Blueprint $table) {
                $table->dropColumn([
                'email',
                'password',
                'remember_token',
                'created_at',
                'updated_at'
            ]);
        });
    }
};
