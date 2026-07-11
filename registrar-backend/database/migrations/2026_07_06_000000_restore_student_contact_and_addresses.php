<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

/**
 * Restores student_contact_information (dropped in 2026_07_05_000000 as
 * apparently-dead code) and properly wires it — plus a new student_addresses
 * table — after discovering it was actually half-built: StudentProfileController
 * had broken validation rules (permanent_address/contact_number, no matching
 * columns) that suggested unfinished work, and OGOS's real /addresses endpoint
 * (OgosAddressDTO) returns MULTIPLE address types per student (Residential,
 * Provincial) each with region data — which the original single-row
 * student_contact_information schema had no way to represent at all.
 *
 * Design:
 *   - student_contact_information: restored, but narrowed to what's actually
 *     per-student-not-per-address: mobile_number, personal_email_address.
 *     Both are populated from OgosStudentDTO on every login (no extra OGOS
 *     API call needed — already fetched during provisioning).
 *   - student_addresses (new): one row per (student_profile_id, address_type),
 *     matching OgosAddressDTO's actual shape including region, which the old
 *     schema dropped entirely. Populated from OGOS's /addresses endpoint.
 *
 * The old address columns (house_unit_number, street, barangay, municipality,
 * province, country) are NOT restored — they couldn't represent multiple
 * address types or region, and nothing ever wrote to them successfully in
 * the first place (see the StudentProfileController bug that prompted this).
 */
return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('student_contact_information')) {
            Schema::create('student_contact_information', function (Blueprint $table) {
                $table->integer('student_contact_id')->autoIncrement();
                $table->integer('student_profile_id');
                $table->string('mobile_number', 20)->nullable();
                $table->string('personal_email_address', 100)->nullable();

                $table->unique('student_profile_id', 'uq_sci_student_profile_id');

                $table->foreign('student_profile_id', 'student_contact_information_ibfk_1')
                    ->references('student_profile_id')->on('student_profile')
                    ->onDelete('cascade');
            });
        }

        if (!Schema::hasTable('student_addresses')) {
            Schema::create('student_addresses', function (Blueprint $table) {
                $table->integer('student_address_id')->autoIncrement();
                $table->integer('student_profile_id');
                // OGOS's confirmed values: "Residential", "Provincial".
                // Left as a plain string rather than an enum — OGOS owns
                // this vocabulary, not us, and a new type from their side
                // shouldn't require a migration here to accept it.
                $table->string('address_type', 30);
                $table->string('street_detail', 255)->nullable();
                $table->string('barangay_code', 20)->nullable();
                $table->string('barangay_name', 150)->nullable();
                $table->string('city_code', 20)->nullable();
                $table->string('city_name', 150)->nullable();
                $table->string('province_code', 20)->nullable();
                $table->string('province_name', 150)->nullable();
                $table->string('region_code', 20)->nullable();
                $table->string('region_name', 150)->nullable();
                $table->timestamp('synced_at')->nullable()
                    ->comment('Last time this row was refreshed from OGOS, not a created/updated audit trail');

                $table->unique(['student_profile_id', 'address_type'], 'uq_sa_student_address_type');

                $table->foreign('student_profile_id', 'student_addresses_ibfk_1')
                    ->references('student_profile_id')->on('student_profile')
                    ->onDelete('cascade');
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('student_addresses');
        Schema::dropIfExists('student_contact_information');
    }
};
