<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Enforces single-use OR numbers at the database layer[cite: 11].
 */
return new class extends Migration
{
    public function up(): void
    {
        if (!$this->hasIndex('document_request', 'document_request_or_number_unique')) {
            Schema::table('document_request', function (Blueprint $table) {
                $table->unique('or_number', 'document_request_or_number_unique');
            });
        }
    }

    public function down(): void
    {
        if ($this->hasIndex('document_request', 'document_request_or_number_unique')) {
            Schema::table('document_request', function (Blueprint $table) {
                $table->dropUnique('document_request_or_number_unique');
            });
        }
    }

    private function hasIndex(string $table, string $indexName): bool
    {
        $connection = Schema::getConnection();

        if ($connection->getDriverName() === 'sqlite') {
            $indexes = $connection->select("PRAGMA index_list($table)");
            foreach ($indexes as $index) {
                if ($index->name === $indexName) {
                    return true;
                }
            }
            return false;
        }

        $database = DB::getDatabaseName();

        $result = DB::selectOne(
            'SELECT COUNT(*) AS count
             FROM information_schema.STATISTICS
             WHERE TABLE_SCHEMA = ?
               AND TABLE_NAME = ?
               AND INDEX_NAME = ?',
            [$database, $table, $indexName]
        );

        return $result && $result->count > 0;
    }
};