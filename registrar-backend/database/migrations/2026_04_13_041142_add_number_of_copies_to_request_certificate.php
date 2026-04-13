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
        Schema::table('request_certificate', function (Blueprint $table) {
            $table->tinyInteger('number_of_copies')->unsigned()->default(1)->after('certificate_type_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('request_certificate', function (Blueprint $table) {
            //
            $table->dropColumn('number_of_copies');
        });
    }
};
