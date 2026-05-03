#!/usr/bin/env python3
"""
RIS Frontend Fix Script
=======================
Fixes three groups of issues in the registrar-frontend:

  1. useNotifications.js — WebSocket channel thrashing
       • The handler was reading `onNewNotification` directly instead of via ref
       • `onNewNotification` was listed in the effect dependency array, causing
         the channel to be torn down and rejoined whenever the parent re-rendered
         with an inline arrow function (i.e. every render).

  2. api.js — dead exports + missing export + inconsistent usage
       • 28 named exports were never imported anywhere in the app
       • `getRequestPurposes` was called by RequestForm.jsx but not exported
       • `export default` was buried mid-file with exports defined after it
       • AlumniRequest.jsx and RequestForm.jsx imported the raw axios instance
         and called it with bare paths, bypassing the named-export layer

  3. Pagination response shape — broken by server-side pagination
       • StudentDashboard: `res.data` (plain array) → `res.data.data` (paginated)
       • StaffDashboard:   `requestsRes.data` → `requestsRes.data?.data`
       • Logbook already handles both shapes via toRows() — no change needed

Usage:
    python3 fix_frontend.py /path/to/registrar-frontend

    # Dry-run (shows what would change, writes nothing):
    python3 fix_frontend.py /path/to/registrar-frontend --dry-run
"""

import sys
import shutil
import argparse
from pathlib import Path
from datetime import datetime
from textwrap import dedent

DRY_RUN = False
CHANGES = []
WARNINGS = []


def info(msg):
    print(f"  ✓ {msg}")


def warn(msg):
    print(f"  ⚠  {msg}")
    WARNINGS.append(msg)


def section(title):
    print(f"\n{'─' * 60}")
    print(f"  {title}")
    print(f"{'─' * 60}")


def read(path):
    return path.read_text(encoding="utf-8")


def backup(path):
    ts = datetime.now().strftime("%Y%m%d_%H%M%S")
    dst = path.with_suffix(path.suffix + f".bak_{ts}")
    if not DRY_RUN:
        shutil.copy2(path, dst)
    info(f"Backed up → {dst.name}")


def write_file(path, content, description=""):
    if not DRY_RUN:
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(content, encoding="utf-8")
    label = "[DRY-RUN] " if DRY_RUN else ""
    info(f"{label}Written: {path.name} — {description}")
    CHANGES.append(str(path))


def patch(path, old, new, description=""):
    if not path.exists():
        warn(f"File not found, skipping: {path}")
        return False
    content = read(path)
    if old not in content:
        warn(f"Pattern not found in {path.name} — {description or repr(old[:60])}")
        return False
    if not DRY_RUN:
        backup(path)
        path.write_text(content.replace(old, new, 1), encoding="utf-8")
    else:
        info(f"[DRY-RUN] Would patch: {path.name} — {description}")
    info(f"Patched: {path.name} — {description}")
    CHANGES.append(str(path))
    return True


# ─────────────────────────────────────────────────────────────────────────────
# Fix 1 — useNotifications.js: stop channel thrashing
# ─────────────────────────────────────────────────────────────────────────────

def fix_notifications_hook(src):
    section("Fix 1 · useNotifications.js — stop WebSocket channel thrashing")

    path = src / "hooks/useNotifications.js"

    # 1a. Use the ref in the handler instead of the raw callback.
    #     The handler runs inside a closure captured at mount time, so
    #     reading onNewNotification directly would be stale after the first
    #     render. The ref always points at the latest value.
    patch(
        path,
        old="        if (typeof onNewNotification === 'function') onNewNotification(e);",
        new="        if (typeof onNewNotificationRef.current === 'function') onNewNotificationRef.current(e);",
        description="Use onNewNotificationRef.current in handler (fixes stale closure)",
    )

    # 1b. Remove `onNewNotification` from the effect dependency array.
    #     The ref pattern exists precisely to avoid this dependency —
    #     keeping it here defeats the purpose and causes the channel to be
    #     left/rejoined on every render when the parent passes an inline fn.
    patch(
        path,
        old="    }, [user?.user_id, fetchNotifications, onNewNotification]);",
        new="    }, [user?.user_id, fetchNotifications]);",
        description="Remove onNewNotification from effect deps (ref handles it)",
    )


# ─────────────────────────────────────────────────────────────────────────────
# Fix 2 — api.js: remove dead exports, add missing one, fix ordering
# ─────────────────────────────────────────────────────────────────────────────

def fix_api_js(src):
    section("Fix 2 · api.js — remove dead exports, add missing ones, fix ordering")

    path = src / "services/api.js"

    # The new api.js keeps only exports that are actually imported somewhere,
    # adds the missing getRequestPurposes that RequestForm uses via raw axios,
    # and moves `export default api` to the very end where it belongs.
    new_content = dedent("""\
        import axios from "axios";

        // -------------------------------------------------------
        // Single axios instance for the entire app.
        // Token injection and 401 handling are done here once —
        // every component imports named functions from this file,
        // never creates its own axios instance or calls axios directly.
        // -------------------------------------------------------
        const api = axios.create({
          baseURL: import.meta.env.VITE_API_URL ?? "http://localhost:8000/api",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
        });

        // Attach Bearer token to every outgoing request automatically.
        api.interceptors.request.use((config) => {
          const token = localStorage.getItem("token");
          if (token) {
            config.headers.Authorization = `Bearer ${token}`;
          }
          return config;
        });

        // On 401 — clear local auth state so stale sessions don't persist.
        // Navigation back to "/" is handled by AuthProvider, not here.
        api.interceptors.response.use(
          (res) => res,
          (err) => {
            if (err.response?.status === 401) {
              localStorage.removeItem("token");
              localStorage.removeItem("user");
            }
            return Promise.reject(err);
          }
        );

        // -------------------------------------------------------
        // SYSTEM USERS (Super Admin only)
        // -------------------------------------------------------
        export const getSystemUsers  = ()         => api.get("/system-users");
        export const getSystemUser   = (id)       => api.get(`/system-users/${id}`);
        export const createSystemUser = (data)    => api.post("/system-users", data);
        export const updateSystemUser = (id, data)=> api.put(`/system-users/${id}`, data);
        export const deleteSystemUser = (id)      => api.delete(`/system-users/${id}`);

        // -------------------------------------------------------
        // ACADEMIC RECORDS
        // -------------------------------------------------------
        export const getAcademicRecords = ()         => api.get("/academic-records");
        export const getAcademicRecord  = (id)       => api.get(`/academic-records/${id}`);

        // -------------------------------------------------------
        // REQUEST STATUSES
        // -------------------------------------------------------
        export const getRequestStatuses = () => api.get("/request-statuses");
        export const getRequestStatus   = (id) => api.get(`/request-statuses/${id}`);

        // -------------------------------------------------------
        // REQUEST PURPOSES
        // Previously missing — RequestForm.jsx was calling axios.get directly.
        // -------------------------------------------------------
        export const getRequestPurposes = () => api.get("/request-purposes");

        // -------------------------------------------------------
        // DOCUMENT TYPES (read: all | write: Admin+)
        // -------------------------------------------------------
        export const getDocumentTypes  = ()          => api.get("/document-types");
        export const getDocumentType   = (id)        => api.get(`/document-types/${id}`);
        export const createDocumentType = (data)     => api.post("/document-types", data);
        export const updateDocumentType = (id, data) => api.put(`/document-types/${id}`, data);
        export const deleteDocumentType = (id)       => api.delete(`/document-types/${id}`);

        // -------------------------------------------------------
        // CERTIFICATIONS (read: all | write: Admin+)
        // -------------------------------------------------------
        export const getCertifications         = ()          => api.get("/certifications");
        export const getCertification          = (id)        => api.get(`/certifications/${id}`);
        export const createCertification       = (data)      => api.post("/certifications", data);
        export const updateCertification       = (id, data)  => api.put(`/certifications/${id}`, data);
        export const getCertificationLayouts   = ()          => api.get("/certifications/layouts");
        export const updateCertificationLayout = (id, data)  => api.put(`/certifications/${id}/layout`, data);
        export const uploadCertificationLayoutLogo = (id, formData) =>
          api.post(`/certifications/${id}/layout/logo`, formData, {
            headers: { "Content-Type": "multipart/form-data" },
          });

        // -------------------------------------------------------
        // DOCUMENT REQUESTS (read: all | write: Student/Alumni | manage: Admin+)
        // Response shape from index: { current_page, data, last_page, per_page, total }
        // Read records from response.data.data, not response.data.
        // -------------------------------------------------------
        export const getDocumentRequests  = (params = {}) => api.get("/document-requests", { params });
        export const getDocumentRequest   = (id)          => api.get(`/document-requests/${id}`);
        export const createDocumentRequest = (data)       => api.post("/document-requests", data);
        export const updateDocumentRequest = (id, data)   => api.put(`/document-requests/${id}`, data);
        export const deleteDocumentRequest = (id)         => api.delete(`/document-requests/${id}`);

        // -------------------------------------------------------
        // REQUEST HISTORY (read-only from the frontend)
        // -------------------------------------------------------
        export const getRequestHistory = () => api.get("/request-history");

        // -------------------------------------------------------
        // AUDIT LOGS (Super Admin only)
        // -------------------------------------------------------
        export const getAuditLogs       = (params = {}) => api.get("/audit-logs", { params });
        export const getAuditLogFilters = ()             => api.get("/audit-logs/filters");

        // -------------------------------------------------------
        // ANALYTICS (Admin + Super Admin)
        // -------------------------------------------------------
        export const getAnalyticsOverview    = (params = {}) => api.get("/analytics/overview",       { params });
        export const getAnalyticsVolumeTrend = (params = {}) => api.get("/analytics/volume-trend",   { params });
        export const getAnalyticsByStatus    = (params = {}) => api.get("/analytics/by-status",      { params });
        export const getAnalyticsByDocType   = (params = {}) => api.get("/analytics/by-document-type", { params });

        // -------------------------------------------------------
        // ANNOUNCEMENTS (read: all authenticated | write: Super Admin)
        // -------------------------------------------------------
        export const getAnnouncements  = (page = 1, perPage = 4) =>
          api.get("/announcements", { params: { page, per_page: perPage } });
        export const getAnnouncement   = (id)        => api.get(`/announcements/${id}`);
        export const createAnnouncement = (data)     => api.post("/announcements", data);
        export const updateAnnouncement = (id, data) => api.put(`/announcements/${id}`, data);
        export const deleteAnnouncement = (id)       => api.delete(`/announcements/${id}`);

        export default api;
    """)

    if not DRY_RUN:
        backup(path)
        path.write_text(new_content, encoding="utf-8")
        info(f"Rewrote api.js — removed 28 dead exports, added getRequestPurposes, moved export default to end")
    else:
        info(f"[DRY-RUN] Would rewrite api.js")
    CHANGES.append(str(path))


# ─────────────────────────────────────────────────────────────────────────────
# Fix 3 — AlumniRequest.jsx: use named exports instead of raw axios
# ─────────────────────────────────────────────────────────────────────────────

def fix_alumni_request(src):
    section("Fix 3 · AlumniRequest.jsx — replace raw axios calls with named exports")

    path = src / "layouts/AlumniRequest.jsx"

    # Replace the raw default import with named imports
    patch(
        path,
        old='import axios from "../services/api.js";',
        new='import { getDocumentTypes, getCertifications, createDocumentRequest } from "../services/api.js";',
        description="Switch from raw axios default import to named exports",
    )

    # Replace raw axios.get calls with named functions
    patch(
        path,
        old='const docsRes = await axios.get("/document-types");',
        new='const docsRes = await getDocumentTypes();',
        description="Replace axios.get('/document-types') with getDocumentTypes()",
    )

    patch(
        path,
        old='const certRes = await axios.get("/certifications");',
        new='const certRes = await getCertifications();',
        description="Replace axios.get('/certifications') with getCertifications()",
    )

    patch(
        path,
        old='const response = await axios.post("/document-requests", payload);',
        new='const response = await createDocumentRequest(payload);',
        description="Replace axios.post('/document-requests') with createDocumentRequest()",
    )


# ─────────────────────────────────────────────────────────────────────────────
# Fix 4 — RequestForm.jsx: use named exports instead of raw axios
# ─────────────────────────────────────────────────────────────────────────────

def fix_request_form(src):
    section("Fix 4 · RequestForm.jsx — replace raw axios calls with named exports")

    path = src / "layouts/RequestForm.jsx"

    patch(
        path,
        old='import axios from "../services/api"',
        new='import { getDocumentTypes, getCertifications, getRequestPurposes, createDocumentRequest } from "../services/api"',
        description="Switch from raw axios default import to named exports",
    )

    patch(
        path,
        old='const docsRes = await axios.get("/document-types");',
        new='const docsRes = await getDocumentTypes();',
        description="Replace axios.get('/document-types') with getDocumentTypes()",
    )

    patch(
        path,
        old='const certRes = await axios.get("/certifications");',
        new='const certRes = await getCertifications();',
        description="Replace axios.get('/certifications') with getCertifications()",
    )

    patch(
        path,
        old='const purposeRes = await axios.get("/request-purposes");',
        new='const purposeRes = await getRequestPurposes();',
        description="Replace axios.get('/request-purposes') with getRequestPurposes()",
    )

    patch(
        path,
        old='const response = await axios.post("/document-requests", payload);',
        new='const response = await createDocumentRequest(payload);',
        description="Replace axios.post('/document-requests') with createDocumentRequest()",
    )


# ─────────────────────────────────────────────────────────────────────────────
# Fix 5 — StudentDashboard.jsx: fix pagination response shape
# ─────────────────────────────────────────────────────────────────────────────

def fix_student_dashboard(src):
    section("Fix 5 · StudentDashboard.jsx — fix pagination response shape")

    path = src / "layouts/StudentDashboard.jsx"

    # After server-side pagination, getDocumentRequests() returns:
    #   { current_page, data: [...], last_page, per_page, total }
    # so res.data is the envelope object, and res.data.data is the records array.
    patch(
        path,
        old="    const studentRequests = res.data",
        new="    const studentRequests = (res.data.data ?? res.data)",
        description="Read records from res.data.data (paginated envelope) with fallback",
    )


# ─────────────────────────────────────────────────────────────────────────────
# Fix 6 — StaffDashboard.jsx: fix pagination response shape
# ─────────────────────────────────────────────────────────────────────────────

def fix_staff_dashboard(src):
    section("Fix 6 · StaffDashboard.jsx — fix pagination response shape")

    path = src / "layouts/StaffDashboard.jsx"

    # requestsRes.data was treated as a plain array.
    # Now it's { current_page, data: [...], ... } so we read .data.data
    patch(
        path,
        old="      const formatted = (requestsRes.data || []).map(r => {",
        new="      const formatted = (requestsRes.data?.data ?? requestsRes.data ?? []).map(r => {",
        description="Read records from requestsRes.data.data with safe fallback",
    )


# ─────────────────────────────────────────────────────────────────────────────
# Entry point
# ─────────────────────────────────────────────────────────────────────────────

def main():
    global DRY_RUN

    parser = argparse.ArgumentParser(
        description=__doc__,
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    parser.add_argument("frontend", help="Path to the registrar-frontend directory")
    parser.add_argument("--dry-run", action="store_true", help="Preview changes without writing any files")
    args = parser.parse_args()

    DRY_RUN = args.dry_run
    frontend = Path(args.frontend).resolve()

    if not frontend.exists():
        print(f"ERROR: Path does not exist: {frontend}")
        sys.exit(1)

    if not (frontend / "src").exists():
        print(f"ERROR: {frontend} doesn't look like a Vite/React project (no src/ folder)")
        sys.exit(1)

    src = frontend / "src"

    print(f"\n{'═' * 60}")
    print(f"  RIS Frontend Fix Script {'(DRY-RUN)' if DRY_RUN else ''}")
    print(f"  Frontend path: {frontend}")
    print(f"{'═' * 60}")

    fix_notifications_hook(src)
    fix_api_js(src)
    fix_alumni_request(src)
    fix_request_form(src)
    fix_student_dashboard(src)
    fix_staff_dashboard(src)

    print(f"\n{'═' * 60}")
    print(f"  Summary")
    print(f"{'═' * 60}")
    print(f"\n  Files touched: {len(set(CHANGES))}")

    if WARNINGS:
        print(f"\n  Warnings ({len(WARNINGS)}):")
        for w in WARNINGS:
            print(f"    ⚠  {w}")

    if not DRY_RUN:
        print("\n  Next steps:")
        print("  1. Rebuild the frontend container:")
        print("       docker compose build frontend")
        print("       docker compose up -d frontend")
        print("  2. Test real-time notifications — open two browser tabs,")
        print("     submit a request in one, confirm the badge updates in the other")
        print("     without a page refresh.")
        print("  3. Verify StaffDashboard and StudentDashboard still load requests")
        print("     correctly with the paginated response shape.")
        print("")

    print(f"  {'DRY-RUN complete — no files written.' if DRY_RUN else 'All fixes applied.'}\n")


if __name__ == "__main__":
    main()
