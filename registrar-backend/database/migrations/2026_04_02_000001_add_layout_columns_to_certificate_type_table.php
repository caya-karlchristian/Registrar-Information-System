<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('certificate_type', function (Blueprint $table) {
            if (!Schema::hasColumn('certificate_type', 'layout_header_left_url')) {
                $table->string('layout_header_left_url', 2048)->nullable();
            }
            if (!Schema::hasColumn('certificate_type', 'layout_header_right_url')) {
                $table->string('layout_header_right_url', 2048)->nullable();
            }
            if (!Schema::hasColumn('certificate_type', 'layout_footer_urls')) {
                $table->json('layout_footer_urls')->nullable();
            }
            if (!Schema::hasColumn('certificate_type', 'layout_header_logo_size')) {
                $table->unsignedSmallInteger('layout_header_logo_size')->nullable();
            }
            if (!Schema::hasColumn('certificate_type', 'layout_footer_logo_size')) {
                $table->unsignedSmallInteger('layout_footer_logo_size')->nullable();
            }
        });
    }

    public function down(): void
    {
        Schema::table('certificate_type', function (Blueprint $table) {
            $table->dropColumn([
                'layout_header_left_url',
                'layout_header_right_url',
                'layout_footer_urls',
                'layout_header_logo_size',
                'layout_footer_logo_size',
            ]);
        });
    }
};
