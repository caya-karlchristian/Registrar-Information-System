<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('admin_profile', function (Blueprint $table) {
            $table->date('date_of_birth')->nullable()->change();
            $table->enum('sex_at_birth', ['Male', 'Female'])->nullable()->change();
        });
    }

    public function down(): void
    {
        Schema::table('admin_profile', function (Blueprint $table) {
            $table->date('date_of_birth')->nullable(false)->change();
            $table->enum('sex_at_birth', ['Male', 'Female'])->nullable(false)->change();
        });
    }
};
