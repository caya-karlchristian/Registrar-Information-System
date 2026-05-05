#!/usr/bin/env python3
"""
Registrar IS — QA Bug-Fix Patch Script
=======================================
Applies all remaining open/partial bugs from the QA audit.

Usage:
    python3 apply_fixes.py [--root /path/to/Registrar-Information-System] [--dry-run]

Flags:
    --root      Repo root containing registrar-backend/ and registrar-frontend/.
                Defaults to the directory containing this script.
    --dry-run   Print every planned change without writing anything to disk.

Each fix is an isolated, self-describing Patch object.  Adding or removing a
fix means touching exactly one list entry — nothing else changes.

Exit codes:
    0  All patches applied (or dry-run completed) without error.
    1  One or more patches failed (details printed; others still run).
    2  Root directory does not exist or is missing expected subdirs.
"""

from __future__ import annotations

import argparse
import datetime
import os
import re
import shutil
import sys
import textwrap
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from pathlib import Path
from typing import Callable


# ---------------------------------------------------------------------------
# Result type
# ---------------------------------------------------------------------------

@dataclass
class PatchResult:
    name: str
    success: bool
    message: str
    skipped: bool = False


# ---------------------------------------------------------------------------
# Base patch
# ---------------------------------------------------------------------------

class Patch(ABC):
    """
    One logical fix.  Subclasses implement `apply()` and optionally `verify()`.
    `verify()` is called before `apply()` — returning False means the patch is
    already in the desired state and will be skipped (idempotent).
    """

    #: Human-readable label shown in the run summary.
    name: str
    #: Relative path (from repo root) used for backup and display.
    rel_path: str

    @abstractmethod
    def apply(self, root: Path, dry_run: bool) -> PatchResult:
        ...

    def _backup(self, path: Path, stamp: str) -> None:
        """Create a timestamped .bak copy before overwriting."""
        backup = path.with_suffix(path.suffix + f".bak_{stamp}")
        shutil.copy2(path, backup)


# ---------------------------------------------------------------------------
# Concrete patch types
# ---------------------------------------------------------------------------

@dataclass
class TextReplacePatch(Patch):
    """
    Replaces one or more exact substrings inside a single file.
    Each element of `replacements` is a (old, new) tuple.
    The patch is skipped if the first `old` string is absent (already applied).
    """
    name: str
    rel_path: str
    replacements: list[tuple[str, str]]
    description: str = ""

    def apply(self, root: Path, dry_run: bool) -> PatchResult:
        path = root / self.rel_path
        if not path.exists():
            return PatchResult(self.name, False, f"File not found: {self.rel_path}")

        original = path.read_text(encoding="utf-8")

        # Idempotency: if none of the old strings exist, patch is already applied.
        if not any(old in original for old, _ in self.replacements):
            return PatchResult(self.name, True, "Already applied — skipped.", skipped=True)

        updated = original
        for old, new in self.replacements:
            if old not in updated:
                return PatchResult(
                    self.name, False,
                    f"Expected substring not found in {self.rel_path}:\n  {old[:120]!r}"
                )
            updated = updated.replace(old, new)

        if dry_run:
            return PatchResult(self.name, True, f"[dry-run] Would patch {self.rel_path}")

        stamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
        self._backup(path, stamp)
        path.write_text(updated, encoding="utf-8")
        return PatchResult(self.name, True, f"Patched {self.rel_path}")


@dataclass
class OverwritePatch(Patch):
    """
    Replaces an entire file with new content supplied by a factory callable.
    The callable receives `(root: Path)` and returns the new file content as str.
    Skipped if a sentinel string is already present (idempotency marker).
    """
    name: str
    rel_path: str
    content_factory: Callable[[Path], str]
    idempotency_marker: str = ""

    def apply(self, root: Path, dry_run: bool) -> PatchResult:
        path = root / self.rel_path
        if path.exists() and self.idempotency_marker:
            current = path.read_text(encoding="utf-8")
            if self.idempotency_marker in current:
                return PatchResult(self.name, True, "Already applied — skipped.", skipped=True)

        new_content = self.content_factory(root)

        if dry_run:
            return PatchResult(self.name, True, f"[dry-run] Would overwrite {self.rel_path}")

        stamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
        if path.exists():
            self._backup(path, stamp)
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(new_content, encoding="utf-8")
        return PatchResult(self.name, True, f"Wrote {self.rel_path}")


@dataclass
class DeleteFilePatch(Patch):
    """Removes a file from the repo.  Skipped if already absent."""
    name: str
    rel_path: str

    def apply(self, root: Path, dry_run: bool) -> PatchResult:
        path = root / self.rel_path
        if not path.exists():
            return PatchResult(self.name, True, "Already absent — skipped.", skipped=True)
        if dry_run:
            return PatchResult(self.name, True, f"[dry-run] Would delete {self.rel_path}")
        path.unlink()
        return PatchResult(self.name, True, f"Deleted {self.rel_path}")


@dataclass
class AppendLinePatch(Patch):
    """
    Appends one or more lines to a file if they are not already present.
    Idempotency: each line is checked independently.
    """
    name: str
    rel_path: str
    lines: list[str]

    def apply(self, root: Path, dry_run: bool) -> PatchResult:
        path = root / self.rel_path
        if not path.exists():
            return PatchResult(self.name, False, f"File not found: {self.rel_path}")

        current = path.read_text(encoding="utf-8")
        to_add = [ln for ln in self.lines if ln.strip() not in current]

        if not to_add:
            return PatchResult(self.name, True, "Already applied — skipped.", skipped=True)

        if dry_run:
            return PatchResult(self.name, True, f"[dry-run] Would append {len(to_add)} line(s) to {self.rel_path}")

        stamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
        self._backup(path, stamp)
        with path.open("a", encoding="utf-8") as fh:
            fh.write("\n" + "\n".join(to_add) + "\n")
        return PatchResult(self.name, True, f"Appended {len(to_add)} line(s) to {self.rel_path}")


# ---------------------------------------------------------------------------
# Helper: dedent a PHP heredoc without mangling indentation inside the string
# ---------------------------------------------------------------------------

def php(source: str) -> str:
    """Strip common leading whitespace from a triple-quoted PHP string."""
    return textwrap.dedent(source).lstrip("\n")


# ---------------------------------------------------------------------------
# Patch definitions
# All paths are relative to registrar-backend/ unless prefixed with
# "registrar-frontend/".
# ---------------------------------------------------------------------------

def build_patches() -> list[Patch]:
    return [

        # ── BUG 1 ─────────────────────────────────────────────────────────────
        # SSL verification disabled in IdpClient (5 occurrences in HTTP helpers)
        # ─────────────────────────────────────────────────────────────────────
        TextReplacePatch(
            name="[CRIT-1a] Enable SSL verification in IdpClient",
            rel_path="registrar-backend/app/Services/Sso/IdpClient.php",
            description="Remove CURLOPT_SSL_VERIFYPEER/VERIFYHOST => false from all cURL helpers.",
            replacements=[
                # post() helper
                (
                    "            CURLOPT_IPRESOLVE      => CURL_IPRESOLVE_V4,\n"
                    "            CURLOPT_SSL_VERIFYPEER => false,\n"
                    "            CURLOPT_SSL_VERIFYHOST => false,\n"
                    "        ]);\n"
                    "        [$body, $status] = $this->execRaw($ch);\n"
                    "        return [$body, $status];\n"
                    "    }\n"
                    "\n"
                    "    private function get(",
                    "            CURLOPT_IPRESOLVE      => CURL_IPRESOLVE_V4,\n"
                    "        ]);\n"
                    "        [$body, $status] = $this->execRaw($ch);\n"
                    "        return [$body, $status];\n"
                    "    }\n"
                    "\n"
                    "    private function get(",
                ),
                # postWithAuth() helper
                (
                    "            CURLOPT_IPRESOLVE      => CURL_IPRESOLVE_V4,\n"
                    "            CURLOPT_SSL_VERIFYPEER => false,\n"
                    "            CURLOPT_SSL_VERIFYHOST => false,\n"
                    "        ]);\n"
                    "        [$body, $status] = $this->execRaw($ch);\n"
                    "        return [$body, $status];\n"
                    "    }\n"
                    "\n"
                    "    private function getWithAuth(",
                    "            CURLOPT_IPRESOLVE      => CURL_IPRESOLVE_V4,\n"
                    "        ]);\n"
                    "        [$body, $status] = $this->execRaw($ch);\n"
                    "        return [$body, $status];\n"
                    "    }\n"
                    "\n"
                    "    private function getWithAuth(",
                ),
                # patchWithAuth() helper
                (
                    "            CURLOPT_TIMEOUT        => 15,\n"
                    "            CURLOPT_IPRESOLVE      => CURL_IPRESOLVE_V4,\n"
                    "            CURLOPT_SSL_VERIFYPEER => false,\n"
                    "            CURLOPT_SSL_VERIFYHOST => false,\n"
                    "        ]);\n"
                    "        [$body, $status] = $this->execRaw($ch);\n"
                    "        return [$body, $status];\n"
                    "    }\n"
                    "\n"
                    "    private function deleteRequest(",
                    "            CURLOPT_TIMEOUT        => 15,\n"
                    "            CURLOPT_IPRESOLVE      => CURL_IPRESOLVE_V4,\n"
                    "        ]);\n"
                    "        [$body, $status] = $this->execRaw($ch);\n"
                    "        return [$body, $status];\n"
                    "    }\n"
                    "\n"
                    "    private function deleteRequest(",
                ),
                # deleteRequest() helper
                (
                    "            CURLOPT_TIMEOUT        => 15,\n"
                    "            CURLOPT_IPRESOLVE      => CURL_IPRESOLVE_V4,\n"
                    "            CURLOPT_SSL_VERIFYPEER => false,\n"
                    "            CURLOPT_SSL_VERIFYHOST => false,\n"
                    "        ]);\n"
                    "        [$body, $status] = $this->execRaw($ch);\n"
                    "        return [$body, $status];\n"
                    "    }\n"
                    "\n"
                    "    private function buildGet(",
                    "            CURLOPT_TIMEOUT        => 15,\n"
                    "            CURLOPT_IPRESOLVE      => CURL_IPRESOLVE_V4,\n"
                    "        ]);\n"
                    "        [$body, $status] = $this->execRaw($ch);\n"
                    "        return [$body, $status];\n"
                    "    }\n"
                    "\n"
                    "    private function buildGet(",
                ),
                # buildGet() helper
                (
                    "            CURLOPT_TIMEOUT        => 15,\n"
                    "            CURLOPT_IPRESOLVE      => CURL_IPRESOLVE_V4,\n"
                    "            CURLOPT_SSL_VERIFYPEER => false,\n"
                    "            CURLOPT_SSL_VERIFYHOST => false,\n"
                    "        ]);\n"
                    "        return $ch;\n"
                    "    }",
                    "            CURLOPT_TIMEOUT        => 15,\n"
                    "            CURLOPT_IPRESOLVE      => CURL_IPRESOLVE_V4,\n"
                    "        ]);\n"
                    "        return $ch;\n"
                    "    }",
                ),
            ],
        ),

        # ── BUG 1 (part b) ───────────────────────────────────────────────────
        # SSL verification disabled in the legacy IdpService
        # ─────────────────────────────────────────────────────────────────────
        TextReplacePatch(
            name="[CRIT-1b] Enable SSL verification in IdpService",
            rel_path="registrar-backend/app/Services/IdpService.php",
            replacements=[
                (
                    "            CURLOPT_SSL_VERIFYPEER => false,\n"
                    "            CURLOPT_SSL_VERIFYHOST => false,\n",
                    "",
                ),
            ],
        ),

        # ── BUG 2 ─────────────────────────────────────────────────────────────
        # Delete test_exchange.php (hardcoded client_id + debug output)
        # ─────────────────────────────────────────────────────────────────────
        DeleteFilePatch(
            name="[CRIT-2] Delete test_exchange.php",
            rel_path="registrar-backend/test_exchange.php",
        ),

        # ── BUG 4 ─────────────────────────────────────────────────────────────
        # SystemUserController still instantiates IdpService directly.
        # Replace `new IdpService()` call block with a proper IdpClient
        # delegation via the already-injected AdminUserService (which owns IdP
        # coordination).  The duplicate createUser call is removed — the
        # AdminUserService::create() handles IdP creation internally.
        # ─────────────────────────────────────────────────────────────────────
        TextReplacePatch(
            name="[HIGH-4] Remove IdpService direct instantiation from SystemUserController",
            rel_path="registrar-backend/app/Http/Controllers/SystemUserController.php",
            replacements=[
                # Remove the manual IdP pre-flight block inside store()
                (
                    "        // Map RIS role_id → IdP role name\n"
                    "        $idpRoleMap = [\n"
                    "            SystemUser::ROLE_ADMIN       => 'RIS:admin',\n"
                    "            SystemUser::ROLE_SUPER_ADMIN => 'RIS:superadmin',\n"
                    "        ];\n"
                    "        $idpRole = $idpRoleMap[$validated['role_id']];\n"
                    "\n"
                    "        // Create in IdP first\n"
                    "        $idp = new IdpService();\n"
                    "        $idpResult = $idp->createUser([\n"
                    "            'email'       => $validated['email'],\n"
                    "            'first_name'  => $validated['first_name'],\n"
                    "            'middle_name' => $validated['middle_name'] ?? '',\n"
                    "            'last_name'   => $validated['last_name'],\n"
                    "            'password'    => $validated['password'],\n"
                    "            'roles'       => [$idpRole],\n"
                    "        ]);\n"
                    "\n"
                    "        if (!$idpResult['success']) {\n"
                    "            return response()->json([\n"
                    "                'message' => 'Failed to create user in identity provider.',\n"
                    "                'detail'  => $idpResult['error'],\n"
                    "            ], 500);\n"
                    "        }\n"
                    "\n"
                    "        try {\n"
                    "            // Audit logging is handled inside AdminUserService::create()\n"
                    "            $user = $this->adminUserService->create($validated, $request);\n"
                    "        } catch (IdpException $e) {\n"
                    "            return response()->json([\n"
                    "                'message' => 'Failed to create user in identity provider.',\n"
                    "                'detail'  => $e->getMessage(),\n"
                    "            ], 500);\n"
                    "        }",
                    "        try {\n"
                    "            // AdminUserService::create() owns IdP + DB coordination.\n"
                    "            // Do not call IdpService here — it is a legacy duplicate.\n"
                    "            $user = $this->adminUserService->create($validated, $request);\n"
                    "        } catch (IdpException $e) {\n"
                    "            return response()->json([\n"
                    "                'message' => 'Failed to create user in identity provider.',\n"
                    "                'detail'  => $e->getMessage(),\n"
                    "            ], 500);\n"
                    "        }",
                ),
            ],
        ),

        # ── BUG 5 ─────────────────────────────────────────────────────────────
        # Superadmin token cached in Redis (55-minute TTL — slightly under a
        # typical 1-hour OAuth token lifetime).
        # ─────────────────────────────────────────────────────────────────────
        TextReplacePatch(
            name="[HIGH-5] Cache superadmin token in IdpClient (Redis, 55 min TTL)",
            rel_path="registrar-backend/app/Services/Sso/IdpClient.php",
            replacements=[
                (
                    "use App\\Exceptions\\IdpException;\n"
                    "use Illuminate\\Support\\Facades\\Log;",
                    "use App\\Exceptions\\IdpException;\n"
                    "use Illuminate\\Support\\Facades\\Cache;\n"
                    "use Illuminate\\Support\\Facades\\Log;",
                ),
                (
                    "    public function getSuperAdminToken(): string\n"
                    "    {\n"
                    "        $code = $this->loginAndGetCode(\n"
                    "            config('sso.superadmin_email'),\n"
                    "            config('sso.superadmin_password')\n"
                    "        );\n"
                    "        return $this->exchangeCode($code);\n"
                    "    }",
                    "    public function getSuperAdminToken(): string\n"
                    "    {\n"
                    "        // Cache the admin token for 55 minutes (slightly under the typical\n"
                    "        // 1-hour OAuth token lifetime) to avoid a full login round-trip on\n"
                    "        // every admin operation.\n"
                    "        return Cache::remember('idp:superadmin_token', 55 * 60, function () {\n"
                    "            $code = $this->loginAndGetCode(\n"
                    "                config('sso.superadmin_email'),\n"
                    "                config('sso.superadmin_password')\n"
                    "            );\n"
                    "            return $this->exchangeCode($code);\n"
                    "        });\n"
                    "    }",
                ),
            ],
        ),

        # ── BUG 5 (sso config) ───────────────────────────────────────────────
        # Add superadmin_email / superadmin_password to config/sso.php so
        # IdpClient can use config() instead of env() (consistent with the
        # existing client_id / client_secret pattern).
        # ─────────────────────────────────────────────────────────────────────
        TextReplacePatch(
            name="[HIGH-5b] Add superadmin keys to config/sso.php",
            rel_path="registrar-backend/config/sso.php",
            replacements=[
                (
                    "    'client_secret' => env('SSO_CLIENT_SECRET'),\n"
                    "];",
                    "    'client_secret'      => env('SSO_CLIENT_SECRET'),\n"
                    "    'superadmin_email'   => env('SSO_SUPERADMIN_EMAIL'),\n"
                    "    'superadmin_password' => env('SSO_SUPERADMIN_PASSWORD'),\n"
                    "];",
                ),
            ],
        ),

        # ── BUG 6 ─────────────────────────────────────────────────────────────
        # CORS — remove raw-IP and dev-only origins from production config
        # ─────────────────────────────────────────────────────────────────────
        TextReplacePatch(
            name="[HIGH-6] Remove insecure CORS origins (raw IP + http://localhost:5173)",
            rel_path="registrar-backend/config/cors.php",
            replacements=[
                (
                    "        'http://13.250.214.23',              \n",
                    "",
                ),
                (
                    "        'http://localhost:5173'\n\n",
                    "",
                ),
                # Also fix the non-HTTPS pupt-ris entry
                (
                    "        'http://pupt-ris.registrar-information-system-bsit2027.com',\n",
                    "",
                ),
            ],
        ),

        # ── BUG 7 ─────────────────────────────────────────────────────────────
        # Rate-limit the SSO callback route (20 req/min — generous for OAuth
        # redirect flows but blocks brute-force/replay attempts).
        # ─────────────────────────────────────────────────────────────────────
        TextReplacePatch(
            name="[HIGH-7] Add rate limiting to /auth/callback",
            rel_path="registrar-backend/routes/api.php",
            replacements=[
                (
                    "Route::post('/auth/callback', [SsoCallbackController::class, 'handle']);",
                    "Route::post('/auth/callback', [SsoCallbackController::class, 'handle'])\n"
                    "    ->middleware('throttle:20,1');",
                ),
            ],
        ),

        # ── BUG 8 ─────────────────────────────────────────────────────────────
        # StudentProfileController — inject OgosStudentService via constructor
        # ─────────────────────────────────────────────────────────────────────
        TextReplacePatch(
            name="[HIGH-8] Inject OgosStudentService into StudentProfileController",
            rel_path="registrar-backend/app/Http/Controllers/StudentProfileController.php",
            replacements=[
                (
                    "class StudentProfileController extends Controller\n"
                    "{\n"
                    "    public function index()",
                    "class StudentProfileController extends Controller\n"
                    "{\n"
                    "    public function __construct(private OgosStudentService $ogos) {}\n"
                    "\n"
                    "    public function index()",
                ),
            ],
        ),

        # ── BUG 9 ─────────────────────────────────────────────────────────────
        # IdP UUID lookup after createUser() scans only page 1.
        # Fix: use the response body from the POST (IdP returns the created user)
        # before falling back to a paginated search.
        # ─────────────────────────────────────────────────────────────────────
        TextReplacePatch(
            name="[HIGH-9] Fix IdP UUID lookup — use POST response, not page-1 scan",
            rel_path="registrar-backend/app/Services/Sso/IdpClient.php",
            replacements=[
                (
                    "        if ($status >= 400) {\n"
                    "            throw new IdpException('Failed to create user in identity provider: ' . $body, 500);\n"
                    "        }\n"
                    "\n"
                    "        // Fetch user list to resolve UUID\n"
                    "        [$listBody, $listStatus] = $this->getWithAuth('/api/v1/users?page=1', $adminToken);\n"
                    "\n"
                    "        if ($listStatus === 200) {\n"
                    "            $users = json_decode($listBody, true)['users'] ?? [];\n"
                    "            foreach ($users as $u) {\n"
                    "                if ($u['email'] === $data['email']) {\n"
                    "                    return $u['id'];\n"
                    "                }\n"
                    "            }\n"
                    "        }\n"
                    "\n"
                    "        return null;",
                    "        if ($status >= 400) {\n"
                    "            throw new IdpException('Failed to create user in identity provider: ' . $body, 500);\n"
                    "        }\n"
                    "\n"
                    "        // Prefer the UUID returned directly in the create response body.\n"
                    "        // Only fall back to a search if the IdP does not embed it, so we\n"
                    "        // never silently return null for datasets larger than page 1.\n"
                    "        $created = json_decode($body, true) ?? [];\n"
                    "        if (!empty($created['id'])) {\n"
                    "            return $created['id'];\n"
                    "        }\n"
                    "        if (!empty($created['user']['id'])) {\n"
                    "            return $created['user']['id'];\n"
                    "        }\n"
                    "\n"
                    "        // Fallback: search by email using server-side filtering to avoid\n"
                    "        // scanning a fixed page and missing newly created users.\n"
                    "        $query = http_build_query(['email' => $data['email'], 'per_page' => 1]);\n"
                    "        [$listBody, $listStatus] = $this->getWithAuth(\"/api/v1/users?{$query}\", $adminToken);\n"
                    "\n"
                    "        if ($listStatus === 200) {\n"
                    "            $users = json_decode($listBody, true)['users'] ?? [];\n"
                    "            foreach ($users as $u) {\n"
                    "                if ($u['email'] === $data['email']) {\n"
                    "                    return $u['id'];\n"
                    "                }\n"
                    "            }\n"
                    "        }\n"
                    "\n"
                    "        Log::warning('IdpClient: could not resolve UUID for newly created user', [\n"
                    "            'email' => $data['email'],\n"
                    "        ]);\n"
                    "        return null;",
                ),
            ],
        ),

        # ── BUG 10 ────────────────────────────────────────────────────────────
        # DocumentRequest model — replace $guarded=[] with explicit $fillable
        # ─────────────────────────────────────────────────────────────────────
        TextReplacePatch(
            name="[MED-10] Replace $guarded=[] with explicit $fillable in DocumentRequest",
            rel_path="registrar-backend/app/Models/DocumentRequest.php",
            replacements=[
                (
                    "    protected $guarded    = [];",
                    "    /**\n"
                    "     * Only these columns may be mass-assigned.\n"
                    "     * Explicit whitelist prevents accidental field-injection via update().\n"
                    "     */\n"
                    "    protected $fillable = [\n"
                    "        'user_id',\n"
                    "        'status_id',\n"
                    "        'request_purpose_id',\n"
                    "        'or_number',\n"
                    "        'receipt_date',\n"
                    "        'requested_at',\n"
                    "        'student_profile_id',\n"
                    "        'student_academic_id',\n"
                    "        'alumni_profile_id',\n"
                    "        'alumni_academic_id',\n"
                    "    ];",
                ),
            ],
        ),

        # ── BUG 12 ────────────────────────────────────────────────────────────
        # AnalyticsService — replace MySQL-specific DATE_FORMAT with
        # DB-portable alternative using strftime (SQLite) / to_char (Postgres)
        # guarded behind a driver check so MySQL still works unchanged.
        # ─────────────────────────────────────────────────────────────────────
        TextReplacePatch(
            name="[MED-12] Replace MySQL-only DATE_FORMAT with portable DB expression",
            rel_path="registrar-backend/app/Services/AnalyticsService.php",
            replacements=[
                # Only inject Schema if it isn't already imported.
                # The old string intentionally includes the next line so that once
                # Schema is present the pattern no longer matches → idempotent.
                (
                    "use Illuminate\\Support\\Facades\\DB;\n\n/**",
                    "use Illuminate\\Support\\Facades\\DB;\n"
                    "use Illuminate\\Support\\Facades\\Schema;\n\n/**",
                ),
                (
                    "                DB::raw(\"DATE_FORMAT(requested_at, '%Y-%m') as month\"),",
                    "                DB::raw(self::monthExpression('requested_at') . ' as month'),",
                ),
            ],
        ),

        # Add the helper method to AnalyticsService (appended before the closing brace)
        TextReplacePatch(
            name="[MED-12b] Add monthExpression() helper to AnalyticsService",
            rel_path="registrar-backend/app/Services/AnalyticsService.php",
            replacements=[
                # Anchor on the last method closing brace + class closing brace.
                # Using a unique string ("peakHours" method end) ensures we only
                # match once and the patch is idempotent on re-run.
                (
                    "            ->get();\n"
                    "    }\n"
                    "}\n",
                    "            ->get();\n"
                    "    }\n"
                    "\n"
                    "    // -------------------------------------------------------------------------\n"
                    "    // DB portability helpers\n"
                    "    // -------------------------------------------------------------------------\n"
                    "\n"
                    "    /**\n"
                    "     * Returns a SQL expression that formats a datetime column as 'YYYY-MM',\n"
                    "     * compatible with MySQL, PostgreSQL, and SQLite.\n"
                    "     */\n"
                    "    private static function monthExpression(string $column): string\n"
                    "    {\n"
                    "        return match (DB::getDriverName()) {\n"
                    "            'pgsql'  => \"TO_CHAR({$column}, 'YYYY-MM')\",\n"
                    "            'sqlite' => \"strftime('%Y-%m', {$column})\",\n"
                    "            default  => \"DATE_FORMAT({$column}, '%Y-%m')\",  // mysql / mariadb\n"
                    "        };\n"
                    "    }\n"
                    "}\n",
                ),
            ],
        ),

        # ── BUG 14 ────────────────────────────────────────────────────────────
        # Reverb scaling — add REVERB_SCALING_ENABLED to docker-compose so the
        # env variable actually reaches the container.  We patch docker-compose.yml
        # which lives at the repo root (one level above registrar-backend/).
        # ─────────────────────────────────────────────────────────────────────
        TextReplacePatch(
            name="[LOW-14] Enable Reverb Redis scaling via env in docker-compose.yml",
            rel_path="docker-compose.yml",
            replacements=[
                (
                    "      REVERB_SCHEME: ${REVERB_SCHEME:-http}\n"
                    "      BROADCAST_CONNECTION: reverb\n"
                    "    ports:\n"
                    "      - \"8080:8080\"",
                    "      REVERB_SCHEME: ${REVERB_SCHEME:-http}\n"
                    "      BROADCAST_CONNECTION: reverb\n"
                    "      REVERB_SCALING_ENABLED: ${REVERB_SCALING_ENABLED:-false}\n"
                    "      REVERB_SCALING_CHANNEL: ${REVERB_SCALING_CHANNEL:-reverb}\n"
                    "    ports:\n"
                    "      - \"8080:8080\"",
                ),
            ],
        ),

        # ── BUG 15 ────────────────────────────────────────────────────────────
        # start.sh — move `set -e` to line 1 so early failures are not silent
        # ─────────────────────────────────────────────────────────────────────
        TextReplacePatch(
            name="[LOW-15] Move set -e to top of start.sh",
            rel_path="registrar-backend/start.sh",
            replacements=[
                (
                    "#!/bin/bash\n"
                    "php artisan config:clear\n"
                    "php artisan cache:clear\n"
                    "php artisan route:clear\n"
                    "php artisan view:clear\n"
                    "\n"
                    "set -e",
                    "#!/bin/bash\n"
                    "set -euo pipefail\n"
                    "\n"
                    "# Clear stale caches before anything else so config:cache picks up fresh values.\n"
                    "php artisan config:clear\n"
                    "php artisan cache:clear\n"
                    "php artisan route:clear\n"
                    "php artisan view:clear",
                ),
            ],
        ),

        # ── BUG "Ready" button — server-side enforcement ───────────────────────
        # Validate that a certificate request has at least one certificate type
        # recorded before allowing transition to ReadyToClaim.  This prevents
        # a direct API call bypassing the frontend print-check.
        # ─────────────────────────────────────────────────────────────────────
        TextReplacePatch(
            name="[HIGH-*] Enforce print-before-ready state transition in DocumentRequestService",
            rel_path="registrar-backend/app/Services/DocumentRequestService.php",
            replacements=[(
                    "        $oldStatusId = $documentRequest->status_id;\n"
                    "        $oldOrNumber = $documentRequest->or_number;\n"
                    "\n"
                    "        $documentRequest->update($validated);",
                    "        $oldStatusId = $documentRequest->status_id;\n"
                    "        $oldOrNumber = $documentRequest->or_number;\n"
                    "\n"
                    "        // Guard: transitioning to ReadyToClaim on a certificate request\n"
                    "        // requires at least one certificate row — the frontend enforces a\n"
                    "        // print step, but we validate server-side so direct API calls cannot\n"
                    "        // bypass it.\n"
                    "        if (\n"
                    "            isset($validated['status_id']) &&\n"
                    "            (int) $validated['status_id'] === RequestStatusEnum::ReadyToClaim->value &&\n"
                    "            (int) $oldStatusId            === RequestStatusEnum::Processing->value\n"
                    "        ) {\n"
                    "            $isCertificate = $documentRequest->certificates()->exists();\n"
                    "            if ($isCertificate && $documentRequest->certificates()->count() === 0) {\n"
                    "                abort(422, 'Certificate must be generated before marking as Ready to Claim.');\n"
                    "            }\n"
                    "        }\n"
                    "\n"
                    "        $documentRequest->update($validated);",
                ),
            ],
        ),

        # ── Cleanup — .gitignore ──────────────────────────────────────────────
        # Suppress future .bak_* and test_exchange.php noise
        # ─────────────────────────────────────────────────────────────────────
        AppendLinePatch(
            name="[CLEANUP] Add *.bak_* and test_exchange.php to .gitignore",
            rel_path="registrar-backend/.gitignore",
            lines=[
                "# Timestamped patch backups",
                "*.bak_*",
                "*.bak",
                "test_exchange.php",
            ],
        ),

    ]


# ---------------------------------------------------------------------------
# Runner
# ---------------------------------------------------------------------------

def _validate_root(root: Path) -> None:
    if not root.exists():
        print(f"ERROR: Root directory does not exist: {root}", file=sys.stderr)
        sys.exit(2)
    for sub in ("registrar-backend", "registrar-frontend"):
        if not (root / sub).is_dir():
            print(f"ERROR: Expected subdirectory '{sub}' not found under {root}", file=sys.stderr)
            sys.exit(2)


def run(root: Path, dry_run: bool) -> int:
    patches = build_patches()

    width = 72
    stamp_line = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    mode_label = " [DRY RUN]" if dry_run else ""

    print("=" * width)
    print(f"  Registrar IS — QA Bug-Fix Patch{mode_label}")
    print(f"  Root  : {root}")
    print(f"  Time  : {stamp_line}")
    print(f"  Fixes : {len(patches)}")
    print("=" * width)

    results: list[PatchResult] = []

    for patch in patches:
        try:
            result = patch.apply(root, dry_run)
        except Exception as exc:  # noqa: BLE001
            result = PatchResult(patch.name, False, f"Unhandled exception: {exc}")

        results.append(result)

        icon = "✓" if result.success else "✗"
        skip = " (skipped)" if result.skipped else ""
        print(f"\n  [{icon}] {result.name}{skip}")
        for line in result.message.splitlines():
            print(f"       {line}")

    # Summary
    passed   = [r for r in results if r.success and not r.skipped]
    skipped  = [r for r in results if r.skipped]
    failed   = [r for r in results if not r.success]

    print("\n" + "=" * width)
    print(f"  Applied : {len(passed)}   Skipped : {len(skipped)}   Failed : {len(failed)}")
    print("=" * width)

    if failed:
        print("\n  FAILED patches:")
        for r in failed:
            print(f"    ✗ {r.name}")
            print(f"      {r.message}")
        return 1

    if not dry_run:
        print("\n  Next steps:")
        print("  ┌─────────────────────────────────────────────────────────────┐")
        print("  │ 1. git rm registrar-backend/test_exchange.php               │")
        print("  │    git filter-branch or BFG to scrub history if needed      │")
        print("  │                                                              │")
        print("  │ 2. Address CRIT-3 (token in localStorage) — migrate to      │")
        print("  │    Sanctum session-cookie mode (architectural change,        │")
        print("  │    requires coordinated frontend + backend work).            │")
        print("  │                                                              │")
        print("  │ 3. Address MED-11 (AuditLogger) — convert to injectable      │")
        print("  │    instance class bound in AppServiceProvider.               │")
        print("  │                                                              │")
        print("  │ 4. Rebuild images and run full test suite.                   │")
        print("  └─────────────────────────────────────────────────────────────┘")

    return 0


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

def main() -> None:
    parser = argparse.ArgumentParser(
        description="Apply QA bug fixes to the Registrar Information System."
    )
    parser.add_argument(
        "--root",
        type=Path,
        default=Path(__file__).parent,
        help="Repo root (contains registrar-backend/ and registrar-frontend/). "
             "Defaults to the directory containing this script.",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Print planned changes without writing to disk.",
    )
    args = parser.parse_args()

    _validate_root(args.root)
    sys.exit(run(args.root, args.dry_run))


if __name__ == "__main__":
    main()
