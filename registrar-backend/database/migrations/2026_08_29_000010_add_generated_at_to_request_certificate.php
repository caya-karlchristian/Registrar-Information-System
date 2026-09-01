<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Adds generated_at timestamp to request_certificate to track print/generation state[cite: 12].
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('request_certificate', function (Blueprint $table) {
            if (!Schema::hasColumn('request_certificate', 'generated_at')) {
                $table->timestamp('generated_at')->nullable()->after('status_id');
            }
        });
    }

    public function down(): void
    {
        Schema::table('request_certificate', function (Blueprint $table) {
            if (Schema::hasColumn('request_certificate', 'generated_at')) {
                $table->dropColumn('generated_at');
            }
        });
    }
};