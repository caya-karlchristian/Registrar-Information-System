<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('audit_logs', function (Blueprint $table) {
            $table->bigIncrements('id');

            // Nullable FK — log survives even if user is deleted
            $table->unsignedInteger('user_id')->nullable();
            $table->foreign('user_id')
                  ->references('user_id')
                  ->on('users')
                  ->nullOnDelete();

            // Snapshots — these never change even if user is modified/deleted
            $table->string('email', 100);
            $table->string('role_name', 50);

            // What happened — e.g. 'login', 'logout', 'admin_created'
            $table->string('action', 100);

            // Optional context
            $table->string('browser', 255)->nullable();
            $table->string('ip_address', 45)->nullable();

            // Auto-set on insert, never updated
            $table->timestamp('created_at')->useCurrent();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('audit_logs');
    }
};