#!/usr/bin/env python3
"""
migrate_logbook_enhancements.py
================================
Applies all P0 logbook & analytics fixes from the RIS architecture review.

Run from the project root (the directory that contains registrar-frontend/
and registrar-backend/).

Changes applied
---------------
  FE-1  logbookHelpers.js — fix getProcessedAt / getMinutesProcessed to use
         new_status_id === 2 (ReadyToClaim) instead of the most-recent entry.

  FE-2  logbookDocx.js — replace the 9 locally-defined helper functions with
         imports from logbookHelpers.js (deduplicate).

  FE-3  Logbook.jsx — replace paginated N+2 fetch pattern with a single
         getLogbookData() call; import all field extractors from
         logbookHelpers.js; remove inline duplicates.

  FE-4  analyticsMonthlyExport.js — replace hardcoded numericValue = 5.0 with
         a computeOpcRating() function driven by actual average processing time;
         replace the paginated fetchAllDocumentRequests() / getRequestHistory()
         pattern with getLogbookData().

  BE-1  DocumentRequestController.php — extend logbook() to accept optional
         ?from=YYYY-MM-DD, ?to=YYYY-MM-DD, and ?doc_type=string query params
         for server-side filtering.

Usage
-----
  python3 migrate_logbook_enhancements.py [--dry-run] [--rollback]

Flags
-----
  --dry-run   Print what would be changed without writing anything.
  --rollback  Restore every file from its .bak_migration backup.
"""

import argparse
import datetime
import hashlib
import json
import os
import re
import shutil
import sys
import textwrap
from pathlib import Path
from typing import Callable

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

TIMESTAMP = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
BAK_SUFFIX = f".bak_migration_{TIMESTAMP}"

FRONTEND_ROOT = Path("registrar-frontend")
BACKEND_ROOT  = Path("registrar-backend")

REPORT: list[dict] = []   # accumulated per-step results


# ---------------------------------------------------------------------------
# Utility helpers
# ---------------------------------------------------------------------------

def abort(msg: str) -> None:
    print(f"\n[FATAL] {msg}", file=sys.stderr)
    sys.exit(1)


def sha256(path: Path) -> str:
    h = hashlib.sha256()
    h.update(path.read_bytes())
    return h.hexdigest()


def backup(path: Path, dry_run: bool) -> Path:
    bak = Path(str(path) + BAK_SUFFIX)
    if not dry_run:
        shutil.copy2(path, bak)
    return bak


def write_file(path: Path, content: str, dry_run: bool) -> None:
    if not dry_run:
        path.write_text(content, encoding="utf-8")


def record(step: str, file: Path, status: str, detail: str = "") -> None:
    REPORT.append({"step": step, "file": str(file), "status": status, "detail": detail})
    icon = {"ok": "✓", "skip": "–", "error": "✗", "dry": "~"}.get(status, "?")
    print(f"  [{icon}] {step}  ({file.name})  {detail}")


def find_file(relative: str) -> Path:
    """Resolve a path that may live directly under the root or one level deeper."""
    direct = Path(relative)
    if direct.exists():
        return direct
    # handle case where zip extraction nested the folder
    nested = Path("registrar-frontend") / relative
    if nested.exists():
        return nested
    nested2 = Path("registrar-backend") / relative
    if nested2.exists():
        return nested2
    abort(f"Cannot locate required file: {relative}")


def resolve_frontend(rel: str) -> Path:
    """Locate a frontend source file, tolerating one level of nesting."""
    candidates = [
        FRONTEND_ROOT / rel,
        FRONTEND_ROOT / FRONTEND_ROOT.name / rel,
        Path(rel),
    ]
    for c in candidates:
        if c.exists():
            return c
    abort(f"Frontend file not found: {rel}\n  Searched: {[str(c) for c in candidates]}")


def resolve_backend(rel: str) -> Path:
    candidates = [
        BACKEND_ROOT / rel,
        BACKEND_ROOT / BACKEND_ROOT.name / rel,
        Path(rel),
    ]
    for c in candidates:
        if c.exists():
            return c
    abort(f"Backend file not found: {rel}\n  Searched: {[str(c) for c in candidates]}")


# ---------------------------------------------------------------------------
# Idempotency guard — skip a step if its sentinel string is already present
# ---------------------------------------------------------------------------

def already_applied(path: Path, sentinel: str) -> bool:
    return sentinel in path.read_text(encoding="utf-8")


# ===========================================================================
# FE-1  logbookHelpers.js — fix getProcessedAt / getMinutesProcessed
# ===========================================================================

HELPERS_SENTINEL = "new_status_id === 2  /* ReadyToClaim — migration FE-1 */"

HELPERS_OLD_PROCESSED_AT = """\
/** Most-recent changed_at timestamp for a row */
export const getProcessedAt = (row, historyByRequestId = {}) => {
  const history = getHistoryRows(row, historyByRequestId);
  return history[0]?.changed_at || null;
};

/** minutes_processed from the most-recent history entry */
export const getMinutesProcessed = (row, historyByRequestId = {}) => {
  const history = getHistoryRows(row, historyByRequestId);
  return history[0]?.minutes_processed ?? null;
};"""

HELPERS_NEW_PROCESSED_AT = """\
/** changed_at from the ReadyToClaim (new_status_id=2) history entry.
 *  This is the true "processed" timestamp — not the most-recent entry,
 *  which for a completed request is the Completed transition.
 *  Fix applied by migration FE-1.
 */
export const getProcessedAt = (row, historyByRequestId = {}) => {
  const history = getHistoryRows(row, historyByRequestId);
  const entry = history.find((h) => h.new_status_id === 2  /* ReadyToClaim — migration FE-1 */);
  return entry?.changed_at || null;
};

/** minutes_processed from the same ReadyToClaim entry for consistency. */
export const getMinutesProcessed = (row, historyByRequestId = {}) => {
  const history = getHistoryRows(row, historyByRequestId);
  const entry = history.find((h) => h.new_status_id === 2);
  return entry?.minutes_processed ?? null;
};"""


def apply_fe1(dry_run: bool) -> None:
    print("\n[FE-1] logbookHelpers.js — fix getProcessedAt / getMinutesProcessed")
    path = resolve_frontend("src/utils/logbookHelpers.js")

    if already_applied(path, HELPERS_SENTINEL):
        record("FE-1", path, "skip", "already applied")
        return

    src = path.read_text(encoding="utf-8")
    if HELPERS_OLD_PROCESSED_AT not in src:
        record("FE-1", path, "error",
               "expected block not found — file may have diverged; skipping")
        return

    bak = backup(path, dry_run)
    new_src = src.replace(HELPERS_OLD_PROCESSED_AT, HELPERS_NEW_PROCESSED_AT, 1)
    write_file(path, new_src, dry_run)
    record("FE-1", path, "dry" if dry_run else "ok",
           f"replaced getProcessedAt/getMinutesProcessed (backup: {bak.name})")


# ===========================================================================
# FE-2  logbookDocx.js — replace local duplicate helpers with imports
# ===========================================================================

DOCX_SENTINEL = "// FE-2 migration: helpers imported from logbookHelpers.js"

# The nine local function declarations to remove
DOCX_LOCAL_HELPERS = [
    "const formatDateLong",
    "const formatMinutesDuration",
    "const getFullName",
    "const getCourse",
    "const getEmail",
    "const getHistoryRows",
    "const getProcessedAt",
    "const getMinutesProcessed",
    "const getClaimedAt",
]

# New import line to inject
DOCX_NEW_IMPORT = (
    "import {\n"
    "  formatDateLong,\n"
    "  formatMinutesDuration,\n"
    "  getFullName,\n"
    "  getCourse,\n"
    "  getEmail,\n"
    "  getHistoryRows,\n"
    "  getProcessedAt,\n"
    "  getMinutesProcessed,\n"
    "  getClaimedAt,\n"
    "  getDocumentNames,\n"
    "  getCertificationNames,\n"
    "} from './logbookHelpers.js';\n"
    "// FE-2 migration: helpers imported from logbookHelpers.js\n"
)

# Pattern to strip a complete const function block (arrow or regular)
def _strip_local_helper(src: str, const_name: str) -> str:
    """
    Remove a top-level `const NAME = (...) => { ... };` or `const NAME = (...) => expr;`
    from src.  Works by locating the declaration line and then consuming lines until the
    brace depth returns to zero (or a single-expression arrow is detected).
    """
    lines = src.split("\n")
    out = []
    i = 0
    while i < len(lines):
        line = lines[i]
        stripped = line.strip()
        # Detect start of the target const
        if stripped.startswith(const_name + " =") or stripped.startswith(const_name + "="):
            # Consume the entire block
            depth = 0
            consumed = False
            j = i
            while j < len(lines):
                seg = lines[j]
                depth += seg.count("{") - seg.count("}")
                if j > i and depth <= 0:
                    # last line of block — also swallow any trailing blank line
                    j += 1
                    if j < len(lines) and lines[j].strip() == "":
                        j += 1
                    consumed = True
                    break
                j += 1
            if not consumed:
                # fallback: just skip to end if depth never closed
                j = len(lines)
            i = j
            continue
        out.append(line)
        i += 1
    return "\n".join(out)


def apply_fe2(dry_run: bool) -> None:
    print("\n[FE-2] logbookDocx.js — replace local helpers with logbookHelpers imports")
    path = resolve_frontend("src/utils/logbookDocx.js")

    if already_applied(path, DOCX_SENTINEL):
        record("FE-2", path, "skip", "already applied")
        return

    src = path.read_text(encoding="utf-8")

    # Check at least some of the local helpers are present
    present = [h for h in DOCX_LOCAL_HELPERS if h in src]
    if not present:
        record("FE-2", path, "skip", "no local helper declarations found — possibly already cleaned")
        return

    bak = backup(path, dry_run)
    new_src = src

    # Strip each local helper block
    for helper in present:
        new_src = _strip_local_helper(new_src, helper)

    # Inject the import after the last existing import line
    last_import_match = None
    for m in re.finditer(r"^import .+;$", new_src, re.MULTILINE):
        last_import_match = m
    if last_import_match:
        insert_pos = last_import_match.end()
        new_src = new_src[:insert_pos] + "\n" + DOCX_NEW_IMPORT + new_src[insert_pos:]
    else:
        # prepend
        new_src = DOCX_NEW_IMPORT + "\n" + new_src

    write_file(path, new_src, dry_run)
    record("FE-2", path, "dry" if dry_run else "ok",
           f"stripped {len(present)} local helpers, added import (backup: {bak.name})")


# ===========================================================================
# FE-3  Logbook.jsx — use getLogbookData() + import from logbookHelpers
# ===========================================================================

LOGBOOK_SENTINEL = "// FE-3 migration: uses getLogbookData() from API"

# Old import line
LOGBOOK_OLD_IMPORT = (
    'import { getDocumentRequests, getDocumentTypes, getRequestHistory, getCertifications } from "../services/api"; '
)

# Replacement import adds getLogbookData, removes getDocumentRequests + getRequestHistory
LOGBOOK_NEW_IMPORT = """\
import { getLogbookData, getDocumentTypes, getCertifications } from '../services/api'; // FE-3 migration: uses getLogbookData() from API
import {
  formatMinutesDuration,
  getProcessedAt,
  getMinutesProcessed,
  getClaimedAt,
  getFullName,
  getCourse,
  getEmail,
  getDocumentNames,
  getCertificationNames,
} from '../utils/logbookHelpers.js';"""

# Old paginated fetch block (exact text from file)
LOGBOOK_OLD_FETCH = """\
  useEffect(() => {
    const fetchLogbookData = async () => {
      setLoading(true);
      try {
        const requests = [];
        let page = 1;
        let lastPage = 1;

        do {
          const response = await getDocumentRequests({ page });
          const payload = response?.data ?? {};
          const rows = toRows(payload);

          requests.push(...rows);
          lastPage = Number(payload?.last_page ?? 1) || 1;
          page += 1;
        } while (page <= lastPage);

        const [typesRes, historyRes, certRes] = await Promise.all([
          getDocumentTypes(),
          getRequestHistory(),
          getCertifications(),
        ]);

        const types = toRows(typesRes.data);
        const historyRows = toRows(historyRes.data);
        const certifications = toRows(certRes.data);
        const groupedHistory = historyRows.reduce((acc, item) => {
          const requestId = item?.request_id;
          if (!requestId) return acc;
          if (!acc[requestId]) acc[requestId] = [];
          acc[requestId].push(item);
          return acc;
        }, {});

        Object.keys(groupedHistory).forEach((requestId) => {
          groupedHistory[requestId].sort((a, b) => {
            const aTime = new Date(a?.changed_at || 0).getTime();
            const bTime = new Date(b?.changed_at || 0).getTime();
            return bTime - aTime;
          });
        });

        setData(requests);
        setDbDocTypes(types);
        setAvailableCertifications(certifications);
        setHistoryByRequestId(groupedHistory);
        setCurrentPage(1);
      } catch (error) {
        console.error('Error loading logbook records:', error);
        setData([]);
        setDbDocTypes([]);
        setAvailableCertifications([]);
        setHistoryByRequestId({});
        setToastError((error && (error.message || error.toString())) || 'Error loading logbook records.');
      } finally {
        setLoading(false);
      }
    };
    fetchLogbookData();
  }, []);"""

LOGBOOK_NEW_FETCH = """\
  useEffect(() => {
    // FE-3 migration: replaced N+2 paginated fetch with single getLogbookData() call.
    // The logbook endpoint returns only completed requests with embedded history[],
    // eliminating the need to paginate all requests + fetch the full history table.
    const fetchLogbookData = async () => {
      setLoading(true);
      try {
        const [logbookRes, typesRes, certRes] = await Promise.all([
          getLogbookData(),
          getDocumentTypes(),
          getCertifications(),
        ]);

        const requests    = toRows(logbookRes.data);
        const types       = toRows(typesRes.data);
        const certifications = toRows(certRes.data);

        setData(requests);
        setDbDocTypes(types);
        setAvailableCertifications(certifications);
        // historyByRequestId is no longer needed — history is embedded in each row.
        // Keep the state variable at {} so downstream helpers that accept it still work.
        setHistoryByRequestId({});
        setCurrentPage(1);
      } catch (error) {
        console.error('Error loading logbook records:', error);
        setData([]);
        setDbDocTypes([]);
        setAvailableCertifications([]);
        setHistoryByRequestId({});
        setToastError((error && (error.message || error.toString())) || 'Error loading logbook records.');
      } finally {
        setLoading(false);
      }
    };
    fetchLogbookData();
  }, []);"""

# The filteredData useMemo filters client-side for 'completed' — no longer needed
# because the logbook endpoint already returns only completed requests.
# We patch it to remove the status_name check.
LOGBOOK_OLD_FILTER_STATUS = (
    "    const completedOnly = data.filter(item => {\n"
    "      if (String(item.status?.status_name).toLowerCase() !== 'completed') return false;\n"
    "      if (from || to) {\n"
    "        const req = item.requested_at ? new Date(item.requested_at) : null;\n"
    "        if (!req) return false;\n"
    "        if (from && req < from) return false;\n"
    "        if (to && req > to) return false;\n"
    "      }\n"
    "      return true;\n"
    "    });"
)

LOGBOOK_NEW_FILTER_STATUS = (
    "    // FE-3: logbook endpoint returns only completed requests — status filter removed.\n"
    "    const completedOnly = data.filter(item => {\n"
    "      if (from || to) {\n"
    "        const req = item.requested_at ? new Date(item.requested_at) : null;\n"
    "        if (!req) return false;\n"
    "        if (from && req < from) return false;\n"
    "        if (to && req > to) return false;\n"
    "      }\n"
    "      return true;\n"
    "    });"
)


def _strip_logbook_inline_helpers(src: str) -> str:
    """Remove the inline const helper block in Logbook.jsx (getProcessedAt etc.)."""
    helpers = [
        "  const getProcessedAt",
        "  const getMinutesProcessed",
        "  const formatMinutesDuration",
        "  const getClaimedAt",
        "  const formatDateLong",  # Logbook may or may not have this
    ]
    lines = src.split("\n")
    out = []
    i = 0
    while i < len(lines):
        line = lines[i]
        stripped = line.strip()
        matched = any(stripped.startswith(h.strip() + " =") for h in helpers)
        if matched:
            # consume until depth returns to 0
            depth = 0
            j = i
            while j < len(lines):
                seg = lines[j]
                depth += seg.count("{") - seg.count("}")
                if j > i and depth <= 0:
                    j += 1
                    # swallow a trailing blank comment line
                    if j < len(lines) and lines[j].strip().startswith("//"):
                        # only swallow if it's a "Get the processing timestamp" style comment
                        if any(kw in lines[j] for kw in ["processing timestamp", "duration", "claimed"]):
                            j += 1
                    if j < len(lines) and lines[j].strip() == "":
                        j += 1
                    break
                j += 1
            i = j
            continue
        out.append(line)
        i += 1
    return "\n".join(out)


def apply_fe3(dry_run: bool) -> None:
    print("\n[FE-3] Logbook.jsx — use getLogbookData() + import helpers")
    path = resolve_frontend("src/layouts/Logbook.jsx")

    if already_applied(path, LOGBOOK_SENTINEL):
        record("FE-3", path, "skip", "already applied")
        return

    src = path.read_text(encoding="utf-8")

    issues = []
    if LOGBOOK_OLD_IMPORT.strip() not in src:
        issues.append("old import line not found (exact match)")
    if LOGBOOK_OLD_FETCH not in src:
        issues.append("old paginated fetch block not found (exact match)")

    if issues:
        record("FE-3", path, "error",
               "file has diverged from expected content — skipping to avoid corruption. "
               "Issues: " + "; ".join(issues))
        return

    bak = backup(path, dry_run)
    new_src = src

    # 1. Replace import line
    new_src = new_src.replace(LOGBOOK_OLD_IMPORT, LOGBOOK_NEW_IMPORT + "\n", 1)

    # 2. Replace paginated fetch block
    new_src = new_src.replace(LOGBOOK_OLD_FETCH, LOGBOOK_NEW_FETCH, 1)

    # 3. Remove inline helpers (getProcessedAt etc.)
    new_src = _strip_logbook_inline_helpers(new_src)

    # 4. Remove client-side status_name filter
    if LOGBOOK_OLD_FILTER_STATUS in new_src:
        new_src = new_src.replace(LOGBOOK_OLD_FILTER_STATUS, LOGBOOK_NEW_FILTER_STATUS, 1)

    write_file(path, new_src, dry_run)
    record("FE-3", path, "dry" if dry_run else "ok",
           f"replaced fetch logic + imports (backup: {bak.name})")


# ===========================================================================
# FE-4  analyticsMonthlyExport.js — fix OPCR rating + use logbook API
# ===========================================================================

ANALYTICS_SENTINEL = "// FE-4 migration: computeOpcRating replaces hardcoded 5.0"

ANALYTICS_OLD_OPCR = "  const numericValue = 5.0;"

ANALYTICS_NEW_OPCR = """\
  // FE-4 migration: computeOpcRating replaces hardcoded 5.0
  // Rating thresholds (minutes per request) — confirm with registrar's performance standards.
  const computeOpcRating = (avgMins) => {
    if (avgMins <= 15)  return 5.0;
    if (avgMins <= 30)  return 4.0;
    if (avgMins <= 60)  return 3.0;
    if (avgMins <= 120) return 2.0;
    return 1.0;
  };
  const numericValue = computeOpcRating(avgMinutesPerRequest);"""

# Old import for analytics
ANALYTICS_OLD_IMPORT = (
    "import { getDocumentTypes, getDocumentRequests, getRequestHistory, getCertifications } from '../services/api';"
)

ANALYTICS_NEW_IMPORT = (
    "import { getDocumentTypes, getLogbookData, getCertifications } from '../services/api';\n"
    "// FE-4 migration: replaced getDocumentRequests+getRequestHistory with getLogbookData()"
)

# Old fetch pattern in analyticsMonthlyExport — the fetchAllDocumentRequests function
# and the call to getRequestHistory.  We replace with a getLogbookData call.
ANALYTICS_OLD_FETCH_FUNC = """\
const fetchAllDocumentRequests = async () => {
  const allRows = [];
  let page = 1;
  let lastPage = 1;
  do {
    const response = await getDocumentRequests({ page });
    const payload = response?.data ?? {};
    const rows = Array.isArray(payload) ? payload : (Array.isArray(payload?.data) ? payload.data : []);
    allRows.push(...rows);
    lastPage = Number(payload?.last_page ?? 1) || 1;
    page += 1;
  } while (page <= lastPage);
  return allRows;
};"""

# Pattern to find the call site (best-effort: match the Promise.all or standalone calls)
ANALYTICS_OLD_HISTORY_FETCH = "  const historyRes = await getRequestHistory();"

ANALYTICS_NEW_HISTORY_FETCH = (
    "  // FE-4: history is embedded in each logbook row — no separate fetch needed."
)

ANALYTICS_OLD_MAIN_CALL = "    fetchAllDocumentRequests(),"
ANALYTICS_NEW_MAIN_CALL = "    getLogbookData(), // FE-4: returns completed requests with embedded history"


def apply_fe4(dry_run: bool) -> None:
    print("\n[FE-4] analyticsMonthlyExport.js — fix OPCR rating + use logbook API")
    path = resolve_frontend("src/utils/analyticsMonthlyExport.js")

    if already_applied(path, ANALYTICS_SENTINEL):
        record("FE-4", path, "skip", "already applied")
        return

    src = path.read_text(encoding="utf-8")

    if ANALYTICS_OLD_OPCR not in src:
        record("FE-4", path, "error",
               "hardcoded numericValue = 5.0 not found at expected location — skipping")
        return

    bak = backup(path, dry_run)
    new_src = src

    # 1. Fix OPCR rating
    new_src = new_src.replace(ANALYTICS_OLD_OPCR, ANALYTICS_NEW_OPCR, 1)

    # 2. Replace import
    if ANALYTICS_OLD_IMPORT in new_src:
        new_src = new_src.replace(ANALYTICS_OLD_IMPORT, ANALYTICS_NEW_IMPORT, 1)

    # 3. Remove fetchAllDocumentRequests function definition (best-effort)
    if ANALYTICS_OLD_FETCH_FUNC in new_src:
        new_src = new_src.replace("\n" + ANALYTICS_OLD_FETCH_FUNC + "\n", "\n", 1)

    # 4. Replace getRequestHistory call
    if ANALYTICS_OLD_HISTORY_FETCH in new_src:
        new_src = new_src.replace(ANALYTICS_OLD_HISTORY_FETCH, ANALYTICS_NEW_HISTORY_FETCH, 1)

    # 5. Replace fetchAllDocumentRequests() call in Promise.all
    if ANALYTICS_OLD_MAIN_CALL in new_src:
        new_src = new_src.replace(ANALYTICS_OLD_MAIN_CALL, ANALYTICS_NEW_MAIN_CALL, 1)

    write_file(path, new_src, dry_run)
    record("FE-4", path, "dry" if dry_run else "ok",
           f"OPCR rating fixed; logbook API wired (backup: {bak.name})")


# ===========================================================================
# BE-1  DocumentRequestController.php — add query params to logbook()
# ===========================================================================

BE1_SENTINEL = "// BE-1 migration: added from/to/doc_type filters"

BE1_OLD = """\
    public function logbook()
    {
        return response()->json(
            DocumentRequest::with(array_merge(self::RELATIONS, ['history']))
                ->whereHas('status', fn ($q) => $q->where('status_name', 'Completed'))
                ->orderByDesc('requested_at')
                ->get(),
            200
        );
    }"""

BE1_NEW = """\
    // BE-1 migration: added from/to/doc_type filters
    // Accepts optional query params:
    //   ?from=YYYY-MM-DD   filter requests on or after this date
    //   ?to=YYYY-MM-DD     filter requests on or before this date
    //   ?doc_type=string   filter by document_name (partial, case-insensitive)
    public function logbook(Request $request)
    {
        $query = DocumentRequest::with(array_merge(self::RELATIONS, ['history']))
            ->whereHas('status', fn ($q) => $q->where('status_name', 'Completed'));

        if ($from = $request->query('from')) {
            $query->whereDate('requested_at', '>=', $from);
        }

        if ($to = $request->query('to')) {
            $query->whereDate('requested_at', '<=', $to);
        }

        if ($docType = $request->query('doc_type')) {
            $query->whereHas('documents.documentType', function ($q) use ($docType) {
                $q->where('document_name', 'like', '%' . $docType . '%');
            });
        }

        return response()->json(
            $query->orderByDesc('requested_at')->get(),
            200
        );
    }"""


def apply_be1(dry_run: bool) -> None:
    print("\n[BE-1] DocumentRequestController.php — add query params to logbook()")
    path = resolve_backend("app/Http/Controllers/DocumentRequestController.php")

    if already_applied(path, BE1_SENTINEL):
        record("BE-1", path, "skip", "already applied")
        return

    src = path.read_text(encoding="utf-8")

    if BE1_OLD not in src:
        record("BE-1", path, "error",
               "expected logbook() block not found — file may have diverged; skipping")
        return

    bak = backup(path, dry_run)
    new_src = src.replace(BE1_OLD, BE1_NEW, 1)
    write_file(path, new_src, dry_run)
    record("BE-1", path, "dry" if dry_run else "ok",
           f"logbook() extended with from/to/doc_type params (backup: {bak.name})")


# ===========================================================================
# Rollback
# ===========================================================================

def rollback() -> None:
    print("\n[ROLLBACK] Searching for migration backups …")
    pattern = re.compile(r"\.bak_migration_\d{8}_\d{6}$")
    restored = 0
    for root, dirs, files in os.walk("."):
        # skip node_modules and vendor
        dirs[:] = [d for d in dirs if d not in ("node_modules", "vendor", ".git", "dist")]
        for fname in files:
            if pattern.search(fname):
                bak_path = Path(root) / fname
                original = Path(str(bak_path).replace(pattern.search(fname).group(), ""))
                shutil.copy2(bak_path, original)
                bak_path.unlink()
                print(f"  ✓ Restored {original}  (removed {bak_path.name})")
                restored += 1
    if restored == 0:
        print("  No migration backups found.")
    else:
        print(f"\n  Restored {restored} file(s).")


# ===========================================================================
# Report writer
# ===========================================================================

def write_report(dry_run: bool) -> None:
    mode = "DRY RUN" if dry_run else "APPLIED"
    report_path = Path(f"migration_report_{TIMESTAMP}.json")
    rollback_path = Path(f"rollback_info_{TIMESTAMP}.md")

    # JSON report
    payload = {
        "timestamp": TIMESTAMP,
        "mode": mode,
        "steps": REPORT,
    }
    report_path.write_text(json.dumps(payload, indent=2), encoding="utf-8")

    # Markdown rollback guide
    bak_files = [
        r["file"] + f".bak_migration_{TIMESTAMP}"
        for r in REPORT
        if r["status"] in ("ok",)
    ]
    rollback_md = textwrap.dedent(f"""
        # Rollback Guide — migration {TIMESTAMP}

        ## Automatic rollback
        ```
        python3 migrate_logbook_enhancements.py --rollback
        ```
        This finds all `.bak_migration_{TIMESTAMP}` files and restores them.

        ## Manual rollback
        The following backup files were created:
        {"".join(f"  - `{f}`{chr(10)}" for f in bak_files) if bak_files else "  (no files were written — dry-run mode)\n"}
        To restore a single file:
        ```bash
        cp <file>.bak_migration_{TIMESTAMP} <file>
        ```

        ## Steps applied
        | Step | File | Status |
        |------|------|--------|
        {"".join(f"| {r['step']} | {Path(r['file']).name} | {r['status']} |{chr(10)}" for r in REPORT)}
    """).lstrip()
    rollback_path.write_text(rollback_md, encoding="utf-8")

    print(f"\n{'─'*60}")
    print(f"  Report  : {report_path}")
    print(f"  Rollback: {rollback_path}")
    print(f"{'─'*60}")


# ===========================================================================
# Validation checks
# ===========================================================================

def pre_flight() -> None:
    """Abort early if the project structure looks wrong."""
    fe_markers = [
        "src/layouts/Logbook.jsx",
        "src/utils/logbookHelpers.js",
        "src/utils/logbookDocx.js",
        "src/utils/analyticsMonthlyExport.js",
        "src/services/api.js",
    ]
    be_markers = [
        "app/Http/Controllers/DocumentRequestController.php",
    ]

    missing = []
    for rel in fe_markers:
        try:
            resolve_frontend(rel)
        except SystemExit:
            missing.append(f"frontend: {rel}")
    for rel in be_markers:
        try:
            resolve_backend(rel)
        except SystemExit:
            missing.append(f"backend: {rel}")

    if missing:
        abort(
            "Could not locate required files. "
            "Make sure you are running from the project root.\n  Missing:\n"
            + "\n".join(f"    {m}" for m in missing)
        )

    # Verify getLogbookData exists in api.js
    api_path = resolve_frontend("src/services/api.js")
    if "getLogbookData" not in api_path.read_text(encoding="utf-8"):
        abort(
            "getLogbookData() is not exported from src/services/api.js.\n"
            "The migration requires this function to be defined before proceeding.\n"
            "Add: export const getLogbookData = () => api.get('/document-requests/logbook');"
        )

    print("  Pre-flight checks passed ✓")


# ===========================================================================
# Entry point
# ===========================================================================

def main() -> None:
    parser = argparse.ArgumentParser(
        description="Apply P0 logbook & analytics fixes to the RIS codebase.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__,
    )
    parser.add_argument(
        "--dry-run", action="store_true",
        help="Show what would change without writing any files."
    )
    parser.add_argument(
        "--rollback", action="store_true",
        help="Restore all files from their .bak_migration backups."
    )
    args = parser.parse_args()

    if args.rollback:
        rollback()
        return

    print("=" * 60)
    print("  RIS Logbook Enhancements Migration")
    print(f"  Timestamp : {TIMESTAMP}")
    print(f"  Mode      : {'DRY RUN — no files will be written' if args.dry_run else 'LIVE'}")
    print("=" * 60)

    print("\n[PRE-FLIGHT] Verifying project structure …")
    pre_flight()

    # Apply all steps
    apply_fe1(args.dry_run)
    apply_fe2(args.dry_run)
    apply_fe3(args.dry_run)
    apply_fe4(args.dry_run)
    apply_be1(args.dry_run)

    # Summary
    ok    = sum(1 for r in REPORT if r["status"] == "ok")
    skip  = sum(1 for r in REPORT if r["status"] == "skip")
    dry   = sum(1 for r in REPORT if r["status"] == "dry")
    err   = sum(1 for r in REPORT if r["status"] == "error")

    print(f"\n{'─'*60}")
    print(f"  Applied: {ok}  |  Dry: {dry}  |  Skipped: {skip}  |  Errors: {err}")
    print("─" * 60)

    if err:
        print("\n⚠  One or more steps were skipped due to file drift.")
        print("   Review the error messages above and apply those changes manually.")

    write_report(args.dry_run)

    if not args.dry_run and ok > 0:
        print(
            "\nNext steps:\n"
            "  1. Review the diffs (git diff) to confirm each change.\n"
            "  2. Rebuild the frontend:  cd registrar-frontend && npm run build\n"
            "  3. Run backend tests:     cd registrar-backend && php artisan test\n"
            "  4. Confirm OPCR rating thresholds with the registrar (analyticsMonthlyExport.js).\n"
            "  5. Tag the commit:        git tag migration/logbook-p0-enhancements\n"
        )


if __name__ == "__main__":
    main()