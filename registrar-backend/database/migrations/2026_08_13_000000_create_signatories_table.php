<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Database-Driven Signatories.
 *
 * GenerateCertificate.jsx has always shipped a hardcoded `signeeOptions`
 * array (Mhel P. Garcia / Marissa B. Ferrer, DEM, RPsy), and
 * utils/helpers.jsx duplicated the same two names + positions in a
 * hardcoded `SIGNATORY_MAP` used to render the signature block on issued
 * certificates. Neither the name, position, nor display order could be
 * changed without a code deploy — this table makes them admin-editable.
 *
 * `sort_order` controls display order in the admin UI and the frontend's
 * dropdown of selectable signees (lower values first), matching the
 * order the two existing signatories already appear in today.
 *
 * Written idempotently (Schema::hasTable / insertOrIgnore), matching the
 * style of the other migrations in this project — safe to re-run from
 * any partial state.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('signatories')) {
            Schema::create('signatories', function (Blueprint $table) {
                $table->id('signatory_id');
                $table->string('name', 255);
                $table->string('position', 255);
                $table->integer('sort_order')->default(0);
                $table->timestamps();
            });
        }

        // Seed the two signatories the frontend previously hardcoded, so
        // upgrading installs keep issuing certificates with the exact same
        // names/positions/order they already had.
        //
        // `name` has no unique constraint (an admin should be free to
        // rename a signatory to something another one already used), so
        // insertOrIgnore() can't key off it the way the policies migration
        // keys off policies.name. Gate on an empty table instead — this
        // migration only ever runs once per install via `migrate`, and the
        // empty-table check keeps it safe to re-run from a partial state
        // without duplicating rows.
        if (DB::table('signatories')->count() === 0) {
            DB::table('signatories')->insert([
                [
                    'name'       => 'Mhel P. Garcia',
                    'position'   => 'Campus Registrar/Head of Registration Office',
                    'sort_order' => 0,
                    'created_at' => now(),
                    'updated_at' => now(),
                ],
                [
                    'name'       => 'Marissa B. Ferrer, DEM, RPsy',
                    'position'   => 'Director',
                    'sort_order' => 1,
                    'created_at' => now(),
                    'updated_at' => now(),
                ],
            ]);
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('signatories');
    }
};
