<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

/**
 * Cleans up the two remaining dead-data items flagged during the database
 * cleanup pass:
 *
 *   1. document_type ids 53, 54, 55 ("test", "test2", "12") — junk rows from
 *      manual testing, identified by name pattern. Deleted only if nothing
 *      references them (defensive — same guard style as the earlier
 *      request_document orphan cleanup), so this can't create new orphans
 *      even if that assumption turns out wrong on a different environment.
 *   2. student_contact_information — zero references anywhere in the
 *      codebase (no model, no controller, no seeder). Dropped outright.
 *
 * IDEMPOTENCY NOTE: written the same defensive way as the previous two
 * cleanup migrations on this database — safe to re-run from any partial
 * state.
 */
return new class extends Migration
{
    public function up(): void
    {
        // --- document_type: delete confirmed junk rows, only if unreferenced
        $junkIds = DB::table('document_type')
            ->whereIn('document_name', ['test', 'test2', '12'])
            ->pluck('document_type_id');

        // document_type is only referenced from request_document in this
        // schema (checked against the full migration history in this thread).
        $stillReferenced = DB::table('request_document')
            ->whereIn('document_type_id', $junkIds)
            ->pluck('document_type_id')
            ->unique();

        $safeToDelete = $junkIds->diff($stillReferenced);

        if ($safeToDelete->isNotEmpty()) {
            DB::table('document_type')->whereIn('document_type_id', $safeToDelete)->delete();
        }

        // --- student_contact_information: drop, nothing in the app uses it --
        Schema::dropIfExists('student_contact_information');
    }

    public function down(): void
    {
        // NOTE: the deleted document_type rows are NOT restored — their
        // original names/content are already unrecoverable from this
        // codebase (see the earlier courses/document_type investigation).
        // Only the table structure below is restored, empty.

        if (!Schema::hasTable('student_contact_information')) {
            Schema::create('student_contact_information', function (Blueprint $table) {
                $table->integer('student_contact_id')->autoIncrement();
                $table->integer('student_profile_id');
                $table->string('mobile_number', 20)->nullable();
                $table->string('personal_email_address', 100)->nullable();
                $table->string('house_unit_number', 50)->nullable();
                $table->string('street', 150)->nullable();
                $table->string('barangay', 150)->nullable();
                $table->string('municipality', 150)->nullable();
                $table->string('province', 150)->nullable();
                $table->string('country', 150)->nullable();

                $table->foreign('student_profile_id', 'student_contact_information_ibfk_1')
                    ->references('student_profile_id')->on('student_profile')
                    ->onDelete('cascade');
            });
        }
    }
};
