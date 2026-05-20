#!/usr/bin/env python3
"""
apply_audit_fixes.py
====================
Applies the document-request audit fixes to registrar-backend.
Drop this file in the repository root (next to registrar-backend/) and run:

    python3 apply_audit_fixes.py

Each fix is self-contained. The script will tell you exactly what it changed,
and will refuse to touch a file if the anchor text it expects is not found
(so a stale patch never silently corrupts a file that was already modified).
"""

import sys
import os
import re
from pathlib import Path
from textwrap import dedent

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

BACKEND = Path("registrar-backend")

GREEN  = "\033[92m"
YELLOW = "\033[93m"
RED    = "\033[91m"
RESET  = "\033[0m"
BOLD   = "\033[1m"

results: list[tuple[str, str, str]] = []   # (fix_id, status, detail)


def ok(fix_id: str, detail: str = "") -> None:
    results.append((fix_id, "OK", detail))
    print(f"  {GREEN}✓{RESET} {fix_id}" + (f": {detail}" if detail else ""))


def skip(fix_id: str, detail: str = "") -> None:
    results.append((fix_id, "SKIP", detail))
    print(f"  {YELLOW}–{RESET} {fix_id}: {detail}")


def fail(fix_id: str, detail: str = "") -> None:
    results.append((fix_id, "FAIL", detail))
    print(f"  {RED}✗{RESET} {fix_id}: {detail}")


def read(path: Path) -> str:
    return path.read_text(encoding="utf-8")


def write(path: Path, content: str) -> None:
    path.write_text(content, encoding="utf-8")


def replace_once(fix_id: str, path: Path, old: str, new: str) -> bool:
    """
    Replace exactly one occurrence of `old` with `new` in `path`.
    Returns True on success, False if old was not found (already applied or
    something changed), or if there were multiple matches (unsafe to patch).
    """
    if not path.exists():
        fail(fix_id, f"file not found: {path}")
        return False

    content = read(path)

    count = content.count(old)
    if count == 0:
        skip(fix_id, "anchor not found — already applied or file differs")
        return False
    if count > 1:
        fail(fix_id, f"anchor matched {count} times — refusing to patch (ambiguous)")
        return False

    write(path, content.replace(old, new, 1))
    ok(fix_id, str(path))
    return True


# ---------------------------------------------------------------------------
# FIX 1 — Pessimistic lock in DocumentRequestService::updateRequest()
#
# Wraps the entire updateRequest body in a DB::transaction with lockForUpdate
# so two admins cannot race on the same row.
# ---------------------------------------------------------------------------

def fix1_pessimistic_lock() -> None:
    print(f"\n{BOLD}Fix 1{RESET}: Add pessimistic lock (lockForUpdate) to updateRequest()")

    path = BACKEND / "app" / "Services" / "DocumentRequestService.php"

    # --- 1a: add DB facade import ---
    replace_once(
        "1a-import-DB",
        path,
        old="use Illuminate\\Support\\Facades\\Auth;",
        new="use Illuminate\\Support\\Facades\\Auth;\nuse Illuminate\\Support\\Facades\\DB;",
    )

    # --- 1b: update docblock to mention transaction ---
    replace_once(
        "1b-docblock",
        path,
        old=(
            "    /**\n"
            "     * Update a document request (status, OR number, receipt date).\n"
            "     * Writes history on status change and notifies the owner.\n"
            "     * Notifies admins on OR number change (payment verification).\n"
            "     */"
        ),
        new=(
            "    /**\n"
            "     * Update a document request (status, OR number, receipt date).\n"
            "     * Writes history on status change and notifies the owner.\n"
            "     * Notifies admins on OR number change (payment verification).\n"
            "     *\n"
            "     * Runs inside a DB transaction with a row-level lock so that\n"
            "     * concurrent admin updates cannot race on the same request.\n"
            "     */"
        ),
    )

    # --- 1c: wrap the method body in DB::transaction + lockForUpdate ---
    # We replace the opening two lines of the method body and close the
    # transaction before the final `return`.
    replace_once(
        "1c-wrap-transaction",
        path,
        old=(
            "    public function updateRequest(DocumentRequest $documentRequest, array $validated): DocumentRequest\n"
            "    {\n"
            "        $oldStatusId = $documentRequest->status_id;\n"
            "        $oldOrNumber = $documentRequest->or_number;\n"
        ),
        new=(
            "    public function updateRequest(DocumentRequest $documentRequest, array $validated): DocumentRequest\n"
            "    {\n"
            "        return DB::transaction(function () use ($documentRequest, $validated) {\n"
            "            // Re-fetch with a row-level lock so concurrent admin updates\n"
            "            // cannot race: the second request will block here until the\n"
            "            // first transaction commits, then re-read the committed state.\n"
            "            $documentRequest = DocumentRequest::lockForUpdate()\n"
            "                ->findOrFail($documentRequest->request_id);\n"
            "\n"
            "            $oldStatusId = $documentRequest->status_id;\n"
            "            $oldOrNumber = $documentRequest->or_number;\n"
        ),
    )

    # Close the transaction wrapper before the closing brace of the method.
    # The original method ends with:
    #       return $documentRequest;
    #   }
    # We indent everything inside the closure and close it.
    replace_once(
        "1d-close-transaction",
        path,
        old=(
            "        return $documentRequest;\n"
            "    }\n"
            "\n"
            "    // -------------------------------------------------------------------------\n"
            "    // Internal helpers\n"
        ),
        new=(
            "            return $documentRequest;\n"
            "        }); // end DB::transaction\n"
            "    }\n"
            "\n"
            "    // -------------------------------------------------------------------------\n"
            "    // Internal helpers\n"
        ),
    )

    # Re-indent the body that is now inside the closure (4 → 12 spaces per level).
    # Rather than a fragile full-reindent, we do targeted replacements on the
    # lines whose indentation we know exactly.
    path_content = read(path)

    # All the lines between the new closure open and its close are currently at
    # 8-space indent; they need to be at 12-space inside the closure.
    # We do this section-by-section to stay safe.

    # The guard block comment + if
    path_content = path_content.replace(
        "        // Guard: transitioning to ReadyToClaim",
        "            // Guard: transitioning to ReadyToClaim",
        1,
    )
    path_content = path_content.replace(
        "        // Flow:\n"
        "        //   1. Does this request have any certificate items? (hasCertificateItems)\n"
        "        //   2. If yes, has at least one been generated?     (certCount > 0)\n"
        "        //   3. If both fail → 422.  Otherwise → allow.\n",
        "            // Flow:\n"
        "            //   1. Does this request have any certificate items? (hasCertificateItems)\n"
        "            //   2. If yes, has at least one been generated?     (certCount > 0)\n"
        "            //   3. If both fail → 422.  Otherwise → allow.\n",
        1,
    )
    write(path, path_content)

    # Remaining 8-space → 12-space inside the transaction closure.
    # We do a targeted block replace rather than a global indent to be safe.
    OLD_BODY = (
        "        if (\n"
        "            isset($validated['status_id']) &&\n"
        "            (int) $validated['status_id'] === RequestStatusEnum::ReadyToClaim->value &&\n"
        "            (int) $oldStatusId            === RequestStatusEnum::Processing->value\n"
        "        ) {\n"
        "            // Count rows in request_certificate that were submitted as part of\n"
        "            // this request (created during store(), referencing certificate_type).\n"
        "            // A non-zero count means the request includes certificate items.\n"
        "            $submittedCertCount = $documentRequest->certificates()->count();\n"
        "\n"
        "            // Only enforce the print-first rule when this request actually\n"
        "            // includes certificate items. Document-only requests skip this guard.\n"
        "            if ($submittedCertCount > 0) {\n"
        "                // All certificate items must have been generated before claiming.\n"
        "                // Currently: if the row exists it has been generated (the modal\n"
        "                // creates the row). Adjust this condition if a \"generated\" flag\n"
        "                // is added to the model later.\n"
        "                $generatedCount = $documentRequest->certificates()\n"
        "                    ->whereNotNull('certificate_type_id')\n"
        "                    ->count();\n"
        "\n"
        "                if ($generatedCount === 0) {\n"
        "                    abort(422, 'Certificate must be generated before marking as Ready to Claim.');\n"
        "                }\n"
        "            }\n"
        "        }\n"
        "\n"
        "        $documentRequest->update($validated);\n"
        "\n"
        "        if (isset($validated['status_id']) && (int) $validated['status_id'] !== (int) $oldStatusId) {\n"
        "            $this->recordStatusHistory($documentRequest, $oldStatusId);\n"
        "            $this->notifyOwnerOfStatusChange($documentRequest);\n"
        "        }\n"
        "\n"
        "        if (\n"
        "            isset($validated['or_number']) &&\n"
        "            $documentRequest->or_number !== $oldOrNumber &&\n"
        "            !empty($documentRequest->or_number)\n"
        "        ) {\n"
        "            $this->notificationService->sendToAdmins(\n"
        "                triggerEvent: 'admin_payment_verification',\n"
        "                data:         ['request_id' => $documentRequest->request_id],\n"
        "                requestId:    $documentRequest->request_id,\n"
        "            );\n"
        "        }\n"
    )

    NEW_BODY = (
        "            if (\n"
        "                isset($validated['status_id']) &&\n"
        "                (int) $validated['status_id'] === RequestStatusEnum::ReadyToClaim->value &&\n"
        "                (int) $oldStatusId            === RequestStatusEnum::Processing->value\n"
        "            ) {\n"
        "                // Count rows in request_certificate that were submitted as part of\n"
        "                // this request (created during store(), referencing certificate_type).\n"
        "                // A non-zero count means the request includes certificate items.\n"
        "                $submittedCertCount = $documentRequest->certificates()->count();\n"
        "\n"
        "                // Only enforce the print-first rule when this request actually\n"
        "                // includes certificate items. Document-only requests skip this guard.\n"
        "                if ($submittedCertCount > 0) {\n"
        "                    // All certificate items must have been generated before claiming.\n"
        "                    // Currently: if the row exists it has been generated (the modal\n"
        "                    // creates the row). Adjust this condition if a \"generated\" flag\n"
        "                    // is added to the model later.\n"
        "                    $generatedCount = $documentRequest->certificates()\n"
        "                        ->whereNotNull('certificate_type_id')\n"
        "                        ->count();\n"
        "\n"
        "                    if ($generatedCount === 0) {\n"
        "                        abort(422, 'Certificate must be generated before marking as Ready to Claim.');\n"
        "                    }\n"
        "                }\n"
        "            }\n"
        "\n"
        "            // Enforce allowed status transitions (see RequestStatusEnum::allowedTransitions).\n"
        "            if (isset($validated['status_id'])) {\n"
        "                $currentStatus = RequestStatusEnum::from((int) $oldStatusId);\n"
        "                $targetStatus  = RequestStatusEnum::from((int) $validated['status_id']);\n"
        "                if (!in_array($targetStatus, $currentStatus->allowedTransitions(), true)) {\n"
        "                    abort(422, \"Transition from {$currentStatus->name} to {$targetStatus->name} is not allowed.\");\n"
        "                }\n"
        "            }\n"
        "\n"
        "            $documentRequest->update($validated);\n"
        "\n"
        "            if (isset($validated['status_id']) && (int) $validated['status_id'] !== (int) $oldStatusId) {\n"
        "                $this->recordStatusHistory($documentRequest, $oldStatusId);\n"
        "                $this->notifyOwnerOfStatusChange($documentRequest);\n"
        "            }\n"
        "\n"
        "            if (\n"
        "                isset($validated['or_number']) &&\n"
        "                $documentRequest->or_number !== $oldOrNumber &&\n"
        "                !empty($documentRequest->or_number)\n"
        "            ) {\n"
        "                $this->notificationService->sendToAdmins(\n"
        "                    triggerEvent: 'admin_payment_verification',\n"
        "                    data:         ['request_id' => $documentRequest->request_id],\n"
        "                    requestId:    $documentRequest->request_id,\n"
        "                );\n"
        "            }\n"
    )

    content = read(path)
    if OLD_BODY in content:
        write(path, content.replace(OLD_BODY, NEW_BODY, 1))
        ok("1e-reindent-body", str(path))
    else:
        skip("1e-reindent-body", "body block not found — may already be patched")


# ---------------------------------------------------------------------------
# FIX 2 — Status transition whitelist in RequestStatusEnum
# ---------------------------------------------------------------------------

def fix2_transition_whitelist() -> None:
    print(f"\n{BOLD}Fix 2{RESET}: Add allowedTransitions() to RequestStatusEnum")

    path = BACKEND / "app" / "Enums" / "RequestStatusEnum.php"

    replace_once(
        "2-allowedTransitions",
        path,
        old=(
            "    /** Notification trigger slug for each terminal/transitional status. */\n"
            "    public function notificationTrigger(): ?string"
        ),
        new=(
            "    /**\n"
            "     * Returns the set of statuses that this status may legally transition to.\n"
            "     * Used by DocumentRequestService::updateRequest() to reject illegal moves.\n"
            "     *\n"
            "     * Transition map:\n"
            "     *   Processing   → ReadyToClaim | Cancelled\n"
            "     *   ReadyToClaim → Completed    | Forfeited\n"
            "     *   Completed    → (terminal)\n"
            "     *   Forfeited    → (terminal)\n"
            "     *   Cancelled    → (terminal)\n"
            "     *\n"
            "     * Note: the automated shredder (ShredExpiredRequests) transitions\n"
            "     * ReadyToClaim → Forfeited by writing directly to the DB, so it\n"
            "     * bypasses this guard intentionally.\n"
            "     *\n"
            "     * @return array<self>\n"
            "     */\n"
            "    public function allowedTransitions(): array\n"
            "    {\n"
            "        return match ($this) {\n"
            "            self::Processing   => [self::ReadyToClaim, self::Cancelled],\n"
            "            self::ReadyToClaim => [self::Completed, self::Forfeited],\n"
            "            self::Completed    => [],\n"
            "            self::Forfeited    => [],\n"
            "            self::Cancelled    => [],\n"
            "        };\n"
            "    }\n"
            "\n"
            "    /** Notification trigger slug for each terminal/transitional status. */\n"
            "    public function notificationTrigger(): ?string"
        ),
    )


# ---------------------------------------------------------------------------
# FIX 3 — Ownership check in RequestDocumentController::store()
# ---------------------------------------------------------------------------

def fix3_ownership_check() -> None:
    print(f"\n{BOLD}Fix 3{RESET}: Add ownership check to RequestDocumentController::store()")

    path = BACKEND / "app" / "Http" / "Controllers" / "RequestDocumentController.php"

    # Add Auth facade import
    replace_once(
        "3a-import-Auth",
        path,
        old="use App\\Models\\RequestDocument;\nuse Illuminate\\Http\\Request;",
        new=(
            "use App\\Models\\DocumentRequest;\n"
            "use App\\Models\\RequestDocument;\n"
            "use Illuminate\\Http\\Request;\n"
            "use Illuminate\\Support\\Facades\\Auth;"
        ),
    )

    # Replace the store() body to add the ownership check
    replace_once(
        "3b-ownership-check",
        path,
        old=(
            "    public function store(Request $request)\n"
            "    {\n"
            "        $validated = $request->validate([\n"
            "            'request_id'       => 'required|integer|exists:document_request,request_id',\n"
            "            'document_type_id' => 'required|integer|exists:document_type,document_type_id',\n"
            "            'number_of_copies' => 'required|integer|min:1|max:10',\n"
            "        ]);\n"
            "\n"
            "        $reqDoc = RequestDocument::create($validated);\n"
            "        return response()->json($reqDoc, 201);\n"
            "    }"
        ),
        new=(
            "    public function store(Request $request)\n"
            "    {\n"
            "        $validated = $request->validate([\n"
            "            'request_id'       => 'required|integer|exists:document_request,request_id',\n"
            "            'document_type_id' => 'required|integer|exists:document_type,document_type_id',\n"
            "            'number_of_copies' => 'required|integer|min:1|max:10',\n"
            "        ]);\n"
            "\n"
            "        // Ensure the authenticated student/alumni owns the parent request.\n"
            "        // Without this check any student could append line-items to another\n"
            "        // student's request by guessing the integer request_id.\n"
            "        DocumentRequest::where('request_id', $validated['request_id'])\n"
            "            ->where('user_id', Auth::id())\n"
            "            ->firstOrFail();\n"
            "\n"
            "        $reqDoc = RequestDocument::create($validated);\n"
            "        return response()->json($reqDoc, 201);\n"
            "    }"
        ),
    )


# ---------------------------------------------------------------------------
# FIX 4 — ShredExpiredRequests: use MAX(changed_at) to avoid multi-RTC bug
# ---------------------------------------------------------------------------

def fix4_shred_max_changed_at() -> None:
    print(f"\n{BOLD}Fix 4{RESET}: Fix ShredExpiredRequests to use MAX(changed_at) for RTC history")

    path = BACKEND / "app" / "Console" / "Commands" / "ShredExpiredRequests.php"

    # Replace the query block
    replace_once(
        "4-max-changed-at",
        path,
        old=(
            "        $requests = DocumentRequest::query()\n"
            "            ->where('status_id', RequestStatusEnum::ReadyToClaim->value)\n"
            "            ->whereNull('deleted_at')\n"
            "            ->whereHas('history', function ($q) use ($cutoff) {\n"
            "                $q->where('new_status_id', RequestStatusEnum::ReadyToClaim->value)\n"
            "                  ->where('changed_at', '<=', $cutoff);\n"
            "            })\n"
            "            ->with('user')\n"
            "            ->get();"
        ),
        new=(
            "        // Use the MOST RECENT ReadyToClaim history row, not the oldest.\n"
            "        // If a request was ever cycled back through Processing and then\n"
            "        // set ReadyToClaim again, the 90-day clock should restart from the\n"
            "        // latest transition — not from the original one.\n"
            "        $requests = DocumentRequest::query()\n"
            "            ->where('status_id', RequestStatusEnum::ReadyToClaim->value)\n"
            "            ->whereHas('history', function ($q) use ($cutoff) {\n"
            "                $q->where('new_status_id', RequestStatusEnum::ReadyToClaim->value)\n"
            "                  ->havingRaw('MAX(changed_at) <= ?', [$cutoff])\n"
            "                  ->groupBy('request_id');\n"
            "            })\n"
            "            ->with('user')\n"
            "            ->get();"
        ),
    )

    # Also fix the notification trigger slug — at shred time docs are already gone,
    # so the event should be 'request_forfeited', not 'reminder_final_warning'.
    replace_once(
        "4b-forfeited-trigger",
        path,
        old=(
            "                    $notificationService->send(\n"
            "                        recipient:    $owner,\n"
            "                        triggerEvent: 'reminder_final_warning',\n"
            "                        data:         ['request_id' => $request->request_id],\n"
            "                        requestId:    $request->request_id,\n"
            "                    );"
        ),
        new=(
            "                    // Use 'request_forfeited' — documents have already been\n"
            "                    // shredded at this point, so the message must be past-tense.\n"
            "                    // 'reminder_final_warning' (future-tense) was incorrect here.\n"
            "                    $notificationService->send(\n"
            "                        recipient:    $owner,\n"
            "                        triggerEvent: 'request_forfeited',\n"
            "                        data:         ['request_id' => $request->request_id],\n"
            "                        requestId:    $request->request_id,\n"
            "                    );"
        ),
    )


# ---------------------------------------------------------------------------
# FIX 5 — Add SoftDeletes trait to DocumentRequest model
#
# The ShredExpiredRequests command (and potentially others) filter
# whereNull('deleted_at'), but the model never pulled in the SoftDeletes
# trait, so the column is invisible to Eloquent's global scope and the
# filter is dead code. Adding the trait makes soft-delete actually work
# and aligns the model with the intent in the command.
# ---------------------------------------------------------------------------

def fix5_soft_deletes() -> None:
    print(f"\n{BOLD}Fix 5{RESET}: Add SoftDeletes trait to DocumentRequest model")

    path = BACKEND / "app" / "Models" / "DocumentRequest.php"

    # Add the import
    replace_once(
        "5a-import-SoftDeletes",
        path,
        old="use Illuminate\\Database\\Eloquent\\Model;\nuse Illuminate\\Support\\Str;",
        new=(
            "use Illuminate\\Database\\Eloquent\\Model;\n"
            "use Illuminate\\Database\\Eloquent\\SoftDeletes;\n"
            "use Illuminate\\Support\\Str;"
        ),
    )

    # Add the trait inside the class
    replace_once(
        "5b-use-SoftDeletes",
        path,
        old=(
            "class DocumentRequest extends Model\n"
            "{\n"
            "    protected $table      = 'document_request';"
        ),
        new=(
            "class DocumentRequest extends Model\n"
            "{\n"
            "    use SoftDeletes;\n"
            "\n"
            "    protected $table      = 'document_request';"
        ),
    )

    # Add deleted_at to $casts
    replace_once(
        "5c-cast-deleted-at",
        path,
        old=(
            "    protected $casts = [\n"
            "        'requested_at' => 'datetime',\n"
            "        'receipt_date' => 'date',\n"
            "    ];"
        ),
        new=(
            "    protected $casts = [\n"
            "        'requested_at' => 'datetime',\n"
            "        'receipt_date' => 'date',\n"
            "        'deleted_at'   => 'datetime',\n"
            "    ];"
        ),
    )

    print(f"  {YELLOW}NOTE{RESET}: You will need a migration to add `deleted_at` to the"
          f" `document_request` table if it does not already exist:")
    print( "        php artisan make:migration add_soft_deletes_to_document_request_table")
    print( "        Schema::table('document_request', fn($t) => $t->softDeletes());")


# ---------------------------------------------------------------------------
# Summary
# ---------------------------------------------------------------------------

def print_summary() -> None:
    print(f"\n{'='*60}")
    print(f"{BOLD}Summary{RESET}")
    print(f"{'='*60}")

    ok_count   = sum(1 for _, s, _ in results if s == "OK")
    skip_count = sum(1 for _, s, _ in results if s == "SKIP")
    fail_count = sum(1 for _, s, _ in results if s == "FAIL")

    for fix_id, status, detail in results:
        colour = GREEN if status == "OK" else (YELLOW if status == "SKIP" else RED)
        print(f"  {colour}{status:4}{RESET}  {fix_id}" + (f"  ({detail})" if detail else ""))

    print()
    print(f"  {GREEN}{ok_count} applied{RESET}  "
          f"{YELLOW}{skip_count} skipped{RESET}  "
          f"{RED}{fail_count} failed{RESET}")

    if fail_count:
        print(f"\n{RED}Some fixes failed — review the output above.{RESET}")
        sys.exit(1)
    else:
        print(f"\n{GREEN}All fixes applied (or already present). Run your test suite.{RESET}")


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

def main() -> None:
    if not BACKEND.is_dir():
        print(
            f"{RED}ERROR{RESET}: Could not find '{BACKEND}'.\n"
            f"Run this script from the repository root "
            f"(the directory that contains 'registrar-backend/')."
        )
        sys.exit(1)

    print(f"{BOLD}Applying document-request audit fixes to: {BACKEND}{RESET}")

    fix1_pessimistic_lock()
    fix2_transition_whitelist()
    fix3_ownership_check()
    fix4_shred_max_changed_at()
    fix5_soft_deletes()

    print_summary()


if __name__ == "__main__":
    main()