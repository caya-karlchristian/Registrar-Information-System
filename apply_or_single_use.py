#!/usr/bin/env python3
"""
apply_or_single_use.py
======================
Adds single-use OR enforcement to the RIS OR validation integration.

What this script does
---------------------
BACKEND
  1. Patches  registrar-backend/app/Services/CashierService.php
               — adds isOrAlreadyUsed() method that checks document_requests
                 table for existing use of the OR number
               — respects CASHIER_SINGLE_USE env flag (false = skip check)

  2. Patches  registrar-backend/app/Http/Controllers/DocumentRequestController.php
               — adds single-use check BEFORE the cashier API call
               — returns 422 with clear error message if OR already used

  3. Patches  registrar-backend/.env
               — adds CASHIER_SINGLE_USE=false (testing mode)

  4. Patches  registrar-backend/.env.example
               — adds CASHIER_SINGLE_USE=false with explanation

Usage
-----
  python3 apply_or_single_use.py
  python3 apply_or_single_use.py --dry-run

Safety
------
  • Backups written to <file>.bak_or_single_use before any write.
  • Idempotency-guarded — safe to run multiple times.
  • New files never overwritten if they already exist.
"""

from __future__ import annotations

import argparse
import shutil
import sys
import textwrap
from pathlib import Path


# ──────────────────────────────────────────────────────────────────────────────
# CLI
# ──────────────────────────────────────────────────────────────────────────────

def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(description="Add single-use OR enforcement to RIS.")
    p.add_argument("--dry-run", action="store_true",
                   help="Print every change without writing anything.")
    return p.parse_args()


# ──────────────────────────────────────────────────────────────────────────────
# Patcher
# ──────────────────────────────────────────────────────────────────────────────

class Patcher:
    def __init__(self, root: Path, dry_run: bool) -> None:
        self.root    = root
        self.dry_run = dry_run
        self._ok:   list[str] = []
        self._skip: list[str] = []
        self._err:  list[str] = []

    def _backup(self, path: Path) -> None:
        bak = path.with_suffix(path.suffix + ".bak_or_single_use")
        if bak.exists():
            return
        if not self.dry_run:
            shutil.copy2(path, bak)

    def _record(self, tag: str, rel: str) -> None:
        self._ok.append(f"  [{tag:8s}] {rel}")

    def patch(self, rel: str, sentinel: str, old: str, new: str) -> None:
        path = self.root / rel
        if not path.exists():
            self._err.append(f"  [ERROR    ] {rel}: file not found")
            return
        text = path.read_text(encoding="utf-8")
        if sentinel in text:
            self._skip.append(f"  [SKIP     ] {rel}  (already patched)")
            return
        if old not in text:
            self._err.append(
                f"  [ERROR    ] {rel}: target string not found — "
                "file may have changed since this script was written"
            )
            return
        if self.dry_run:
            self._record("PATCH", rel)
            return
        try:
            self._backup(path)
            path.write_text(text.replace(old, new, 1), encoding="utf-8")
            self._record("PATCH", rel)
        except OSError as exc:
            self._err.append(f"  [ERROR    ] {rel}: {exc}")

    def append_if_missing(self, rel: str, sentinel: str, content: str) -> None:
        path = self.root / rel
        if not path.exists():
            self._err.append(f"  [ERROR    ] {rel}: file not found")
            return
        text = path.read_text(encoding="utf-8")
        if sentinel in text:
            self._skip.append(f"  [SKIP     ] {rel}  (already patched)")
            return
        if self.dry_run:
            self._record("APPEND", rel)
            return
        try:
            self._backup(path)
            with open(path, "a", encoding="utf-8") as f:
                f.write(content)
            self._record("APPEND", rel)
        except OSError as exc:
            self._err.append(f"  [ERROR    ] {rel}: {exc}")

    def report(self) -> int:
        print()
        if self._ok:
            print("Changes applied:")
            print("\n".join(self._ok))
        if self._skip:
            print("\nSkipped (already done):")
            print("\n".join(self._skip))
        if self._err:
            print("\nErrors:")
            print("\n".join(self._err))
            return 1
        return 0


# ──────────────────────────────────────────────────────────────────────────────
# Patch definitions
# ──────────────────────────────────────────────────────────────────────────────

def define_patches() -> list[dict]:
    return [
        # ── 1. CashierService — add isOrAlreadyUsed() method ──────────────────
        {
            "rel":      "registrar-backend/app/Services/CashierService.php",
            "sentinel": "isOrAlreadyUsed",
            "old":      "    // -------------------------------------------------------------------------\n"
                        "    // Private helpers\n"
                        "    // -------------------------------------------------------------------------",
            "new": (
                "    // -------------------------------------------------------------------------\n"
                "    // Single-use enforcement\n"
                "    // -------------------------------------------------------------------------\n"
                "\n"
                "    /**\n"
                "     * Check if an OR number has already been used in a previous request.\n"
                "     *\n"
                "     * Controlled by CASHIER_SINGLE_USE env flag:\n"
                "     *   false (default) — always returns false (bypass for testing)\n"
                "     *   true            — queries document_requests table for existing use\n"
                "     *\n"
                "     * @param  string   $orNo          The OR number to check\n"
                "     * @param  int|null $excludeRequestId  Exclude this request ID (for updates)\n"
                "     * @return bool  true if OR is already used and single-use is enforced\n"
                "     */\n"
                "    public function isOrAlreadyUsed(string $orNo, ?int $excludeRequestId = null): bool\n"
                "    {\n"
                "        if (!config('services.cashier.single_use', false)) {\n"
                "            return false; // single-use not enforced — testing mode\n"
                "        }\n"
                "\n"
                "        $query = \\App\\Models\\DocumentRequest::where('or_number', $orNo)\n"
                "            ->whereNotNull('or_number');\n"
                "\n"
                "        if ($excludeRequestId) {\n"
                "            $query->where('request_id', '!=', $excludeRequestId);\n"
                "        }\n"
                "\n"
                "        return $query->exists();\n"
                "    }\n"
                "\n"
                "    // -------------------------------------------------------------------------\n"
                "    // Private helpers\n"
                "    // -------------------------------------------------------------------------"
            ),
        },
        # ── 2. CashierService — add single_use to config read ─────────────────
        {
            "rel":      "registrar-backend/app/Services/CashierService.php",
            "sentinel": "services.cashier.single_use",
            "old":      "        $this->apiKey = config('services.cashier.api_key', '');\n"
                        "        $this->apiUrl = config('services.cashier.url', 'https://puptec.ojt-ims-bsit.net/api/verify-payment');",
            "new": (
                "        $this->apiKey = config('services.cashier.api_key', '');\n"
                "        $this->apiUrl = config('services.cashier.url', 'https://puptec.ojt-ims-bsit.net/api/verify-payment');\n"
                "        // single_use is read directly via config() in isOrAlreadyUsed()\n"
                "        // so no need to store it as a property — it's always fresh."
            ),
        },
        # ── 3. config/services.php — add single_use to cashier config ─────────
        {
            "rel":      "registrar-backend/config/services.php",
            "sentinel": "single_use",
            "old":      "    'cashier' => [\n"
                        "        'api_key' => env('CASHIER_API_KEY', ''),\n"
                        "        'url'     => env('CASHIER_API_URL', 'https://puptec.ojt-ims-bsit.net/api/verify-payment'),\n"
                        "    ],",
            "new": (
                "    'cashier' => [\n"
                "        'api_key'     => env('CASHIER_API_KEY', ''),\n"
                "        'url'         => env('CASHIER_API_URL', 'https://puptec.ojt-ims-bsit.net/api/verify-payment'),\n"
                "        // single_use: when true, each OR number can only be used once.\n"
                "        // Set to false during development/testing to reuse OR numbers.\n"
                "        'single_use'  => env('CASHIER_SINGLE_USE', false),\n"
                "    ],"
            ),
        },
        # ── 4. DocumentRequestController — add single-use check in store() ────
        {
            "rel":      "registrar-backend/app/Http/Controllers/DocumentRequestController.php",
            "sentinel": "or-validation: single-use check",
            "old":      "        // or-validation: verify OR before creating request\n"
                        "        if (!empty($validated['or_number'])) {",
            "new": (
                "        // or-validation: single-use check\n"
                "        if (!empty($validated['or_number'])) {\n"
                "            if ($this->cashierService->isOrAlreadyUsed($validated['or_number'])) {\n"
                "                $message = 'This OR number has already been used for a previous request. Each Official Receipt can only be used once.';\n"
                "                return response()->json([\n"
                "                    'message' => $message,\n"
                "                    'errors'  => ['or_number' => [$message]],\n"
                "                ], 422);\n"
                "            }\n"
                "        }\n"
                "\n"
                "        // or-validation: verify OR before creating request\n"
                "        if (!empty($validated['or_number'])) {"
            ),
        },
    ]


# ──────────────────────────────────────────────────────────────────────────────
# .env additions
# ──────────────────────────────────────────────────────────────────────────────

ENV_ADDITION = (
    "\n"
    "# Single-use OR enforcement\n"
    "# false = allow reuse (testing mode)\n"
    "# true  = each OR can only be used once (production)\n"
    "CASHIER_SINGLE_USE=false\n"
)

ENV_EXAMPLE_ADDITION = (
    "\n"
    "# Single-use OR enforcement\n"
    "# false = allow reuse (testing/development)\n"
    "# true  = each OR can only be used once (set this in production)\n"
    "CASHIER_SINGLE_USE=false\n"
)


# ──────────────────────────────────────────────────────────────────────────────
# Main
# ──────────────────────────────────────────────────────────────────────────────

def main() -> int:
    args    = parse_args()
    root    = Path(__file__).parent
    patcher = Patcher(root, args.dry_run)

    mode = "DRY RUN — no files will be written" if args.dry_run else "Applying changes…"
    print(f"\nRIS OR Single-Use scaffold  |  {mode}\n{'─' * 56}")

    print("\n[1/3] Patching existing files…")
    for p in define_patches():
        patcher.patch(p["rel"], p["sentinel"], p["old"], p["new"])

    print("\n[2/3] Updating .env files…")
    patcher.append_if_missing(
        "registrar-backend/.env",
        "CASHIER_SINGLE_USE",
        ENV_ADDITION,
    )
    patcher.append_if_missing(
        "registrar-backend/.env.example",
        "CASHIER_SINGLE_USE",
        ENV_EXAMPLE_ADDITION,
    )

    print("\n[3/3] Summary")
    exit_code = patcher.report()

    if exit_code == 0:
        print(textwrap.dedent("""
        ──────────────────────────────────────────────────────────
        OR Single-Use scaffold complete.

        Next steps
        ──────────
        Restart backend (no rebuild needed — only .env + PHP changes):
          docker compose up -d backend
          docker exec ris_backend php artisan config:clear

        Testing (single-use OFF)
          CASHIER_SINGLE_USE=false → OR 1048185 can be reused freely
          Submit multiple requests with the same OR — all will pass

        Go live (single-use ON)
          Set CASHIER_SINGLE_USE=true in registrar-backend/.env
          docker compose up -d backend
          docker exec ris_backend php artisan config:clear
          Each OR can now only be used for one request.

        Verify
          Submit two requests with OR 1048185 (single-use=false) → both pass
          Set CASHIER_SINGLE_USE=true, restart, try again → second rejected
        ──────────────────────────────────────────────────────────
        """).strip())
    else:
        print("\nOne or more errors occurred. Review the output above.")

    return exit_code


if __name__ == "__main__":
    sys.exit(main())
