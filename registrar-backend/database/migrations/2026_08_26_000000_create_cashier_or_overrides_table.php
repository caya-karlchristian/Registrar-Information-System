<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Scoped, audited admin override for cashier OR verification.
 *
 * Background
 * ----------
 * CashierService::verifyPayment() calls an external Cashier API that can
 * reject a genuinely valid receipt — e.g. the cashier admin typed the
 * name in a format NameMatcher's candidate list doesn't happen to cover,
 * or the Cashier API is simply wrong/stale for that one OR. The ONLY
 * existing escape hatch for that was blanking CASHIER_API_KEY, which
 * doesn't just skip the one stuck OR — it puts every student and every
 * alumni, system-wide, into mock mode (CashierService::mockResponse()
 * always returns valid:true) for as long as the key stays blank, with no
 * log of why it was disabled and nothing stopping it from quietly
 * staying off after the one case is resolved.
 *
 * This table is the industry-standard alternative: a human explicitly
 * vouches for ONE (or_number, user_id) pair, with a required written
 * reason, fully audited (see AuditLog::ACTION_CASHIER_OVERRIDE_CREATED /
 * ACTION_CASHIER_OVERRIDE_CONSUMED / ACTION_CASHIER_OVERRIDE_REVOKED).
 * It never touches CASHIER_API_KEY and never affects any other student's
 * submission — every other student's OR still goes through the full,
 * strict CashierService::verifyPayment() + NameMatcher retry loop
 * unchanged.
 *
 * Design choice — verified_items
 * -------------------------------
 * Bypassing the Cashier API for this one OR means there is no `items[]`
 * payload for CashierDocumentMatcher to check the request against. To
 * avoid silently disabling that money-facing check on an overridden OR
 * (see CashierDocumentMatcher's own docblock — quantity/item enforcement
 * is a deliberately separate concern from "does this OR/name exist"),
 * the approving admin must transcribe what the physical receipt actually
 * shows into `verified_items`, in the exact shape the Cashier API's own
 * items[] would have used ({ document, amount, quantity }). That data
 * then flows into CashierDocumentMatcher::match() exactly as if it had
 * come from the live API — the override only ever substitutes the DATA
 * SOURCE (human transcription of a receipt an admin has physically
 * verified vs. an API call), never the enforcement itself.
 *
 * Single use, scoped, and revocable
 * ----------------------------------
 * - `used_at` / `used_by_request_id` are set the moment this override is
 *   actually consumed by a successful DocumentRequestController::store()
 *   call — a second attempt to use the same override is rejected
 *   regardless of the CASHIER_SINGLE_USE config flag (that flag governs
 *   OR-number reuse across the whole system; this is a narrower,
 *   always-on guard specific to the override object itself).
 * - An unused override can be revoked by an admin (`revoked_at` /
 *   `revoked_by`) if it was created in error or is no longer needed.
 * - Only one ACTIVE (unused, unrevoked) override may exist for a given
 *   (or_number, user_id) pair at a time — enforced at the application
 *   layer inside a locked transaction in CashierOrOverrideController::
 *   store(), the same pattern this codebase already uses for
 *   UnmatchedCashierItem's dedupe-on-resolve check, rather than a
 *   partial unique index (not portable across the MySQL/SQLite split
 *   this schema already has to support — see the base schema migration's
 *   own notes on that).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('cashier_or_overrides', function (Blueprint $table) {
            // Plain integer autoincrement, matching every other table's PK
            // convention in this schema (see unmatched_cashier_items,
            // document_type, certificate_type) rather than Laravel's
            // default bigIncrements.
            $table->integer('override_id')->autoIncrement();

            // Matches document_request.or_number's length exactly.
            $table->string('or_number', 50);

            // The student/alumni this override applies to. Plain
            // `integer`, NOT unsignedBigInteger — users.user_id is a
            // plain autoincrement `integer` column (see create_base_schema
            // migration) and every existing FK against it uses the same
            // type; a bigint-vs-int mismatch silently fails to create the
            // FK constraint on MySQL even though SQLite (the test suite)
            // tolerates it — this must match exactly for production.
            // Nullable for the same nullOnDelete reason as created_by
            // below — the override row (and its audit value) should
            // outlive the referenced account being deleted. Always set
            // on create at the application layer.
            $table->integer('user_id')->nullable();

            // Required written justification — the whole point of this
            // being a scoped, audited override rather than a silent
            // bypass. Enforced as required in
            // StoreCashierOrOverrideRequest, not just here.
            $table->text('reason');

            // Admin-transcribed receipt line items, in the same shape as
            // the Cashier API's own items[] — see class docblock above.
            // Nullable at the schema level only because an override MAY
            // in principle apply to a request with no document/certificate
            // patterns to check (rare); StoreCashierOrOverrideRequest is
            // the real gate on when this is required.
            $table->json('verified_items')->nullable();

            // The admin who created this override. Nullable (not
            // required-not-null) purely so the FK below can use
            // nullOnDelete() — an override record must survive the
            // creating admin's account later being deleted, same as
            // unmatched_cashier_items.resolved_by already does. The
            // application layer always sets this on create; it is never
            // intentionally left null.
            $table->integer('created_by')->nullable();

            // Denormalized role label at time of creation ('admin' or
            // 'super_admin') — mirrors the same denormalization already
            // used for audit_logs.role_name (see AuditLogger::
            // resolveRoleName's docblock: audit trails should record the
            // role that was active at the time, not whatever the account
            // holds later), and lets this table answer "which role
            // approved overrides" directly without joining into
            // audit_logs for routine reporting.
            $table->string('created_by_role', 20);

            // Set atomically when this override is actually consumed by
            // a successful document request submission.
            $table->timestamp('used_at')->nullable();
            $table->integer('used_by_request_id')->nullable();

            // Set when an admin revokes an unused override.
            $table->timestamp('revoked_at')->nullable();
            $table->integer('revoked_by')->nullable();

            $table->timestamps();

            // Lookup index for the hot path (checking whether an active
            // override exists for a given OR + user during
            // verifyReceiptAgainstCashier()) — not unique, since a
            // resolved (used/revoked) row must never block a fresh
            // override being issued later for the same pair.
            $table->index(['or_number', 'user_id'], 'cashier_or_overrides_lookup_idx');

            // Supports the admin list view's default "active only" filter.
            $table->index(['used_at', 'revoked_at'], 'cashier_or_overrides_status_idx');

            $table->foreign('user_id')
                ->references('user_id')->on('users')
                ->nullOnDelete();

            $table->foreign('created_by')
                ->references('user_id')->on('users')
                ->nullOnDelete();

            $table->foreign('revoked_by')
                ->references('user_id')->on('users')
                ->nullOnDelete();

            $table->foreign('used_by_request_id')
                ->references('request_id')->on('document_request')
                ->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('cashier_or_overrides');
    }
};
