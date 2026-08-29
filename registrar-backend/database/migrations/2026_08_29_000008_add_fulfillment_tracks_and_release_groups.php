<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Phase 3 from the original CTC/logbook reconciliation roadmap — grouping
 * claiming by fulfillment_track, so a request mixing a fast plain document
 * with a slow CTC item doesn't force one printed ticket to cover both, or
 * conversely explode into one ticket per line item for routine multi-copy
 * requests.
 *
 * fulfillment_track — a plain lookup table (same shape/reasoning as
 * access_type and logbook_category: admins add/rename tracks from an admin
 * screen later, no migration/deploy needed). A document_type/
 * certificate_type row with fulfillment_track_id = NULL is on the implicit
 * "standard" track — most rows won't need one set at all, matching the
 * observation from the logbook_category migration that most items don't
 * diverge from the default.
 *
 * request_release_group — created ONLY when a request's items actually
 * span more than one distinct track (see RequestReleaseGroupService::
 * assignReleaseGroups()). A single-track request (the overwhelming
 * majority — most requests are either all-plain or all-CTC, not mixed)
 * gets ZERO release-group rows and keeps working exactly as it does
 * today: one document_request.uuid/claim_code, one ticket, no schema this
 * migration adds is ever touched for it. Each release group carries its
 * own uuid/claim_code (identical generation scheme to DocumentRequest's —
 * see the model) and its own status_id, computed the same "earliest-
 * stage-wins" way RequestItemStatusService already computes
 * document_request.status_id, but scoped to just that group's items.
 *
 * request_document.request_release_group_id / request_certificate.
 * request_release_group_id are nullable: null means "this item belongs to
 * no group of its own — it's covered by the request-level ticket", which
 * is the default and by far the common case.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('fulfillment_track')) {
            Schema::create('fulfillment_track', function (Blueprint $table) {
                $table->integer('fulfillment_track_id')->autoIncrement();
                $table->string('name', 150);
                $table->timestamp('created_at')->nullable()->useCurrent();
                $table->timestamp('updated_at')->nullable()->useCurrent()->useCurrentOnUpdate();

                $table->unique('name', 'fulfillment_track_name_unique');
            });
        }

        Schema::table('document_type', function (Blueprint $table) {
            if (!Schema::hasColumn('document_type', 'fulfillment_track_id')) {
                $table->integer('fulfillment_track_id')->nullable()->after('logbook_category_id');
                $table->index('fulfillment_track_id', 'document_type_fulfillment_track_idx');
                $table->foreign('fulfillment_track_id', 'document_type_fulfillment_track_fk')
                    ->references('fulfillment_track_id')->on('fulfillment_track');
            }
        });

        Schema::table('certificate_type', function (Blueprint $table) {
            if (!Schema::hasColumn('certificate_type', 'fulfillment_track_id')) {
                $table->integer('fulfillment_track_id')->nullable()->after('logbook_category_id');
                $table->index('fulfillment_track_id', 'certificate_type_fulfillment_track_idx');
                $table->foreign('fulfillment_track_id', 'certificate_type_fulfillment_track_fk')
                    ->references('fulfillment_track_id')->on('fulfillment_track');
            }
        });

        if (!Schema::hasTable('request_release_group')) {
            Schema::create('request_release_group', function (Blueprint $table) {
                $table->integer('request_release_group_id')->autoIncrement();
                $table->integer('request_id');
                $table->integer('fulfillment_track_id')->nullable();
                $table->integer('status_id');
                $table->char('uuid', 36);
                $table->string('claim_code', 6)->nullable();
                $table->timestamp('created_at')->nullable()->useCurrent();

                $table->unique('uuid', 'request_release_group_uuid_unique');
                $table->unique('claim_code', 'request_release_group_claim_code_unique');

                $table->foreign('request_id', 'request_release_group_request_fk')
                    ->references('request_id')->on('document_request')
                    ->onDelete('cascade');
                $table->foreign('fulfillment_track_id', 'request_release_group_track_fk')
                    ->references('fulfillment_track_id')->on('fulfillment_track');
                $table->foreign('status_id', 'request_release_group_status_fk')
                    ->references('status_id')->on('request_status');

                $table->index('request_id', 'request_release_group_request_idx');
            });
        }

        Schema::table('request_document', function (Blueprint $table) {
            if (!Schema::hasColumn('request_document', 'request_release_group_id')) {
                $table->integer('request_release_group_id')->nullable()->after('status_id');
                $table->index('request_release_group_id', 'request_document_release_group_idx');
                $table->foreign('request_release_group_id', 'request_document_release_group_fk')
                    ->references('request_release_group_id')->on('request_release_group')
                    ->onDelete('set null');
            }
        });

        Schema::table('request_certificate', function (Blueprint $table) {
            if (!Schema::hasColumn('request_certificate', 'request_release_group_id')) {
                $table->integer('request_release_group_id')->nullable()->after('status_id');
                $table->index('request_release_group_id', 'request_certificate_release_group_idx');
                $table->foreign('request_release_group_id', 'request_certificate_release_group_fk')
                    ->references('request_release_group_id')->on('request_release_group')
                    ->onDelete('set null');
            }
        });
    }

    public function down(): void
    {
        Schema::table('request_certificate', function (Blueprint $table) {
            if (Schema::hasColumn('request_certificate', 'request_release_group_id')) {
                $table->dropForeign('request_certificate_release_group_fk');
                $table->dropIndex('request_certificate_release_group_idx');
                $table->dropColumn('request_release_group_id');
            }
        });

        Schema::table('request_document', function (Blueprint $table) {
            if (Schema::hasColumn('request_document', 'request_release_group_id')) {
                $table->dropForeign('request_document_release_group_fk');
                $table->dropIndex('request_document_release_group_idx');
                $table->dropColumn('request_release_group_id');
            }
        });

        Schema::dropIfExists('request_release_group');

        Schema::table('certificate_type', function (Blueprint $table) {
            if (Schema::hasColumn('certificate_type', 'fulfillment_track_id')) {
                $table->dropForeign('certificate_type_fulfillment_track_fk');
                $table->dropIndex('certificate_type_fulfillment_track_idx');
                $table->dropColumn('fulfillment_track_id');
            }
        });

        Schema::table('document_type', function (Blueprint $table) {
            if (Schema::hasColumn('document_type', 'fulfillment_track_id')) {
                $table->dropForeign('document_type_fulfillment_track_fk');
                $table->dropIndex('document_type_fulfillment_track_idx');
                $table->dropColumn('fulfillment_track_id');
            }
        });

        Schema::dropIfExists('fulfillment_track');
    }
};
