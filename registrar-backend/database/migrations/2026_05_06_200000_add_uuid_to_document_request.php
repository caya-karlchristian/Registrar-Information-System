<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('document_request', function (Blueprint $table) {
            // Add uuid column — nullable initially so existing rows don't violate NOT NULL
            $table->uuid('uuid')->nullable()->unique()->after('request_id');
        });

        // Backfill existing rows
        DB::table('document_request')->whereNull('uuid')->orderBy('request_id')->each(function ($row) {
            DB::table('document_request')
                ->where('request_id', $row->request_id)
                ->update(['uuid' => (string) Str::uuid()]);
        });

        // Now enforce NOT NULL
        Schema::table('document_request', function (Blueprint $table) {
            $table->uuid('uuid')->nullable(false)->change();
        });
    }

    public function down(): void
    {
        Schema::table('document_request', function (Blueprint $table) {
            $table->dropColumn('uuid');
        });
    }
};
