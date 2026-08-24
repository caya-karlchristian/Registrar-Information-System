<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Phase 3a — Audit Log Revamp: RIS-Only Security Events.
 *
 * Deliberately a SEPARATE table from audit_logs, not new action constants
 * on it — see the plan doc's "Trade-off: same audit_log table vs. a
 * separate security/debug log" section for the full reasoning. Short
 * version: audit_logs is a hash-chained, append-only COMPLIANCE record
 * (who changed what) with a small, low-volume, high-signal write rate.
 * Failed logins are a different category — much higher volume (every bad
 * password, every bot scan), lower per-row value, and consumed
 * differently (an engineer debugging a possible brute-force burst, not a
 * compliance reviewer). Mixing them either drowns the audit log in noise
 * or forces a cryptographic-integrity cost onto data that doesn't need
 * it.
 *
 * Scope is intentionally narrow — only the two things that happen
 * outside the IDP's own visibility by design (confirmed via the IDP
 * dashboard screenshot review, see plan doc §5):
 *   - failed local (break-glass) login attempts — LocalAuthService::attempt()
 *   - IDP-unreachable fallback events — AuthController's IDP catch block
 *
 * Not hash-chained (unlike audit_logs) — this table is operational/
 * security signal for RIS's own team, not a tamper-evident compliance
 * artifact, and is expected to be pruned on a retention schedule (see
 * PruneSecurityEvents command) rather than kept forever.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('security_events', function (Blueprint $table) {
            // Plain integer autoincrement, matching every other table's PK
            // convention in this schema (see e.g. unmatched_cashier_items,
            // document_type_id) rather than Laravel's default
            // bigIncrements — kept consistent so this table doesn't stand
            // out as the one exception.
            $table->integer('security_event_id')->autoIncrement();

            // Top-level category. Kept as a plain indexed string (not an
            // enum column) so a future event type (rate-limit trip,
            // background job failure) never needs a migration to add a
            // new enum value — same reasoning SecurityEvent's PHP
            // constants exist for: one source of truth in code, not in
            // the schema.
            $table->string('event_type', 50);

            // Finer-grained subtype within event_type, e.g. for
            // event_type = 'login_failed': bad_password / user_not_found /
            // local_auth_disabled / inactive_account. Nullable because not
            // every event_type needs one (e.g. 'idp_unreachable' doesn't).
            $table->string('reason', 50)->nullable();

            // Attempted email, exactly as submitted. Deliberately NOT a
            // foreign key to users — a failed login attempt very often
            // targets an email that doesn't correspond to any account
            // (typos, enumeration, bot scans), and the whole point of this
            // table is to capture that even when no user row exists to
            // link to.
            $table->string('email', 100)->nullable();

            $table->string('ip_address', 45)->nullable();
            $table->string('user_agent', 255)->nullable();

            // Free-form extensibility, same role as audit_logs.metadata —
            // e.g. the IDP exception message for an idp_unreachable event.
            $table->json('metadata')->nullable();

            // Write-once — no updated_at (see SecurityEvent::$timestamps).
            $table->timestamp('created_at')->useCurrent();

            // Composite index matches the two ways this table is actually
            // queried: AuditLogController-style filtering (by event_type,
            // newest first) and the retention job's cutoff scan.
            $table->index(['event_type', 'created_at'], 'security_events_type_created_idx');

            // Supports SecurityEventLogger's per-email burst lookup
            // (COUNT(*) WHERE email = ? AND created_at >= ?) without a
            // full table scan as this table grows.
            $table->index('email', 'security_events_email_idx');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('security_events');
    }
};
