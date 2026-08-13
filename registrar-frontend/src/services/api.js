import axios from "axios";

// -------------------------------------------------------
// Single axios instance for the entire app.
// Token injection and 401 handling are done here once —
// every component imports named functions from this file,
// never creates its own axios instance or calls axios directly.
// -------------------------------------------------------
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? "http://localhost:8000/api",
  // withCredentials: true sends the HttpOnly 'token' cookie on every request.
  // The backend reads it via Sanctum's cookie guard — no manual header needed.
  withCredentials: true,
  headers: {
    Accept: "application/json",
    "Content-Type": "application/json",
  },
});

// No manual token header needed — withCredentials: true above causes the
// browser to send the HttpOnly 'token' cookie automatically.
// Sanctum reads and validates it on the server side.

// On 401 — clear non-sensitive local state so stale UI doesn't persist.
// The HttpOnly cookie is cleared by the server on logout; we just clear
// the local user cache here.  Navigation to "/" is handled by AuthProvider.
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
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

// User Management — Policy Attachment (Super Admin only).
// Attaching `null` detaches the currently-assigned policy from the admin.
export const attachUserPolicy = (userId, policyId) =>
  api.patch(`/system-users/${userId}/policy`, { policy_id: policyId });

// -------------------------------------------------------
// LOCAL (BREAK-GLASS) AUTH (Super Admin only)
// -------------------------------------------------------
// Enables/updates local bcrypt fallback login for a user so they can
// still sign in if the IdP is down. Backend additionally rejects any
// target whose role isn't Super Admin — see SetLocalPasswordRequest.
export const setLocalPassword = (userId, password, passwordConfirmation) =>
  api.post("/auth/local-password", {
    user_id: userId,
    password,
    password_confirmation: passwordConfirmation,
  });

// -------------------------------------------------------
// POLICIES (Super Admin only)
// -------------------------------------------------------
export const getPolicies   = ()          => api.get("/policies");
export const createPolicy  = (data)      => api.post("/policies", data);
export const updatePolicy  = (id, data)  => api.put(`/policies/${id}`, data);
export const deletePolicy  = (id)        => api.delete(`/policies/${id}`);

// -------------------------------------------------------
// ACCESS REQUESTS — self-service intake, centralized approval.
// store() only requires the 'access_requests' module (any admin);
// index/approve/reject are Super Admin only — enforced server-side by
// AccessRequestPolicy regardless of what the UI shows. getMyAccessRequests
// is available to any admin/super-admin and is hard-scoped server-side to
// the caller's own submissions (AccessRequestPolicy::viewOwn).
// -------------------------------------------------------
export const getAccessRequests    = (params = {}) => api.get("/access-requests", { params });
export const getMyAccessRequests  = (params = {}) => api.get("/access-requests/mine", { params });
export const submitAccessRequest  = (data)         => api.post("/access-requests", data);
export const approveAccessRequest = (id)           => api.post(`/access-requests/${id}/approve`);
export const rejectAccessRequest  = (id, reason)   => api.post(`/access-requests/${id}/reject`, { reason });

// -------------------------------------------------------
// ROLE ASSIGNMENTS (Super Admin only) — Multi-Role Assignments.
// Onboards/offboards a *secondary*, concurrent role onto an existing
// account (e.g. granting a restricted Admin role to someone who already
// holds Student — the "student staff" case). Powers UserManagement.jsx's
// "Roles" action/modal. `getMyRoleAssignments` in authService.js is the
// separate, any-authenticated-user version of this used by the role
// switcher — this one is the full, Super-Admin-only history/management
// view (RoleAssignmentController::index/store/revoke).
// -------------------------------------------------------
export const getRoleAssignments   = (params = {}) => api.get("/role-assignments", { params });
export const grantRoleAssignment  = (data)         => api.post("/role-assignments", data);
export const revokeRoleAssignment = (id, reason)   => api.post(`/role-assignments/${id}/revoke`, { reason });

// GET /role-assignments/search-users?q= — typeahead lookup across ALL
// roles (student/alumni/admin/super admin), used by GrantRoleUserPicker
// to find a target account. Deliberately separate from getSystemUsers(),
// which only ever returns admin/super-admin accounts.
export const searchGrantableUsers = (q) => api.get("/role-assignments/search-users", { params: { q } });

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
// PROGRAMS (read-only — populated automatically on student login)
// -------------------------------------------------------
export const getPrograms = () => api.get("/programs");

// -------------------------------------------------------
// DOCUMENT TYPES (read: all | write: Admin+)
// -------------------------------------------------------
export const getDocumentTypes  = ()          => api.get("/document-types");
export const getDocumentType   = (id)        => api.get(`/document-types/${id}`);
export const createDocumentType = (data)     => api.post("/document-types", data);
export const updateDocumentType = (id, data) => api.put(`/document-types/${id}`, data);
export const deleteDocumentType = (id)       => api.delete(`/document-types/${id}`);
export const archiveDocumentType = (id, reason) => api.patch(`/document-types/${id}/archive`, { reason });
export const restoreDocumentType = (id)      => api.patch(`/document-types/${id}/restore`);

// -------------------------------------------------------
// CERTIFICATIONS (read: all | write: Admin+)
// -------------------------------------------------------
export const getCertifications         = ()          => api.get("/certifications");
export const getCertification          = (id)        => api.get(`/certifications/${id}`);
export const createCertification       = (data)      => api.post("/certifications", data);
export const updateCertification       = (id, data)  => api.put(`/certifications/${id}`, data);
export const deleteCertification       = (id)        => api.delete(`/certifications/${id}`);
export const archiveCertification      = (id, reason)        => api.patch(`/certifications/${id}/archive`, { reason });
export const restoreCertification      = (id)        => api.patch(`/certifications/${id}/restore`);
export const getCertificationLayouts   = ()          => api.get("/certifications/layouts");
export const updateCertificationLayout = (id, data)  => api.put(`/certifications/${id}/layout`, data);
export const uploadCertificationLayoutLogo = (id, formData) =>
  api.post(`/certifications/${id}/layout/logo`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });

// -------------------------------------------------------
// SIGNATORIES (certificate signees) — read/write: Admin only
// (unlike document-types/certifications, GET is admin-only here too —
// see routes/api.php)
// -------------------------------------------------------
export const getSignatories    = ()          => api.get("/signatories");
export const createSignatory   = (data)      => api.post("/signatories", data);
export const updateSignatory   = (id, data)  => api.put(`/signatories/${id}`, data);
export const deleteSignatory   = (id)        => api.delete(`/signatories/${id}`);

// -------------------------------------------------------
// BUSINESS CALENDAR — one-off dated closures + recurring overrides
// (Admin with the "business_calendar" module, or Super Admin)
// -------------------------------------------------------
export const getCalendarExceptions   = (params = {}) => api.get("/calendar-exceptions", { params });
export const createCalendarException = (data)        => api.post("/calendar-exceptions", data);
export const updateCalendarException = (id, data)    => api.put(`/calendar-exceptions/${id}`, data);
export const deleteCalendarException = (id)          => api.delete(`/calendar-exceptions/${id}`);

export const getCalendarOverrides    = (params = {}) => api.get("/calendar-overrides", { params });
export const createCalendarOverride  = (data)        => api.post("/calendar-overrides", data);
export const updateCalendarOverride  = (id, data)    => api.put(`/calendar-overrides/${id}`, data);
export const deleteCalendarOverride  = (id)          => api.delete(`/calendar-overrides/${id}`);

// -------------------------------------------------------
// DOCUMENT REQUESTS (read: all | write: Student/Alumni | manage: Admin+)
// Response shape from index: { current_page, data, last_page, per_page, total }
// Read records from response.data.data, not response.data.
// -------------------------------------------------------
export const getDocumentRequests  = (params = {}) => api.get("/document-requests", { params });
export const getLogbookData       = (params = {}) => api.get("/document-requests/logbook", { params });

// BE-2 backend fix paginated /document-requests/logbook (previously an
// unbounded ->get() of every completed request ever). Logbook.jsx and
// analyticsMonthlyExport.js both filter/group across the FULL completed-
// request history client-side (by doc type, certification, date range),
// so they can't just take page 1 — they need every row.
//
// This pages through the endpoint at 100 rows/request (capped server-side
// at 100 too) and concatenates the results, so:
//   - the backend never answers one unbounded query
//   - existing consumers keep working against the full dataset unchanged
//
// This is a stopgap, not the end state — if the completed-request table
// grows large enough that paging through everything on every load becomes
// slow, the real fix is moving the doc-type/certification/date filters
// server-side (they're already partially there — see `from`/`to`/`doc_type`
// on this endpoint) and having the DOCX export hit a dedicated endpoint
// that streams matching rows instead of relying on the client having
// already loaded them all.
export const getAllLogbookData = async (params = {}) => {
  const perPage = 100;
  const MAX_PAGES = 500; // safety cap — avoids an infinite loop if last_page ever misbehaves
  let page = 1;
  let all = [];

  while (page <= MAX_PAGES) {
    const res = await getLogbookData({ ...params, page, per_page: perPage });
    const body = res.data;

    // Back-compat: if an older/unpaginated backend build is deployed,
    // the endpoint just returns a plain array — take it and stop.
    if (Array.isArray(body)) {
      all = body;
      break;
    }

    const rows = Array.isArray(body?.data) ? body.data : [];
    all = all.concat(rows);

    const lastPage = body?.last_page ?? body?.meta?.last_page ?? page;
    if (rows.length === 0 || page >= lastPage) break;
    page += 1;
  }

  return all;
};

export const getDocumentRequest   = (id)          => api.get(`/document-requests/${id}`);
export const createDocumentRequest = (data)       => api.post("/document-requests", data);

// Public — no auth required. Used by RequestForm's confirmation screen to
// tell requesters whether the Registrar is open right now, and when
// processing will begin if not.
export const getBusinessHoursStatus = () => api.get("/business-hours/status");
export const updateDocumentRequest = (id, data)   => api.put(`/document-requests/${id}`, data);
export const deleteDocumentRequest = (id)         => api.delete(`/document-requests/${id}`);

// Archive / restore (Admin+) — reversible, does not change status_id.
export const archiveDocumentRequest  = (id)  => api.patch(`/document-requests/${id}/archive`);
export const restoreDocumentRequest  = (id)  => api.patch(`/document-requests/${id}/restore`);
export const archiveDocumentRequests = (ids) => api.post(`/document-requests/archive-bulk`, { request_ids: ids });
export const restoreDocumentRequests = (ids) => api.post(`/document-requests/restore-bulk`, { request_ids: ids });

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
export const getAnalyticsOverview      = (params = {}) => api.get("/analytics/overview",          { params });
export const getAnalyticsVolumeTrend   = (params = {}) => api.get("/analytics/volume-trend",      { params });
export const getAnalyticsByStatus      = (params = {}) => api.get("/analytics/by-status",          { params });
export const getAnalyticsByDocType     = (params = {}) => api.get("/analytics/by-document-type",   { params });
export const getAnalyticsProcessingTime = (params = {}) => api.get("/analytics/processing-time",  { params });
export const getAnalyticsPeakHours     = (params = {}) => api.get("/analytics/peak-hours",         { params });
export const getAnalyticsByPurpose     = (params = {}) => api.get("/analytics/by-purpose",         { params });
export const postAnalyticsAiReport     = (params = {}) => api.post("/analytics/ai-report", {},     { params });
export const postAnalyticsAiQuery      = (body  = {}) => api.post("/analytics/ai-query",  body);

// -------------------------------------------------------
// ANNOUNCEMENTS (read: all authenticated | write: Super Admin)
// -------------------------------------------------------
export const getAnnouncements  = (page = 1, perPage = 4) =>
  api.get("/announcements", { params: { page, per_page: perPage } });
export const getArchivedAnnouncements = (page = 1, perPage = 4) =>
  api.get("/announcements", { params: { page, per_page: perPage, view: "archived" } });
export const getAnnouncement   = (id)        => api.get(`/announcements/${id}`);
export const createAnnouncement = (data)     => api.post("/announcements", data);
export const updateAnnouncement = (id, data) => api.put(`/announcements/${id}`, data);
export const deleteAnnouncement = (id)       => api.delete(`/announcements/${id}`);
export const archiveAnnouncement = (id, reason) => api.patch(`/announcements/${id}/archive`, { reason });
export const restoreAnnouncement = (id)      => api.patch(`/announcements/${id}/restore`);

// -------------------------------------------------------
// ALUMNI SYSTEM (PUPTAPS) — proxied through RIS backend
// read: all authenticated roles
// -------------------------------------------------------
export const getAlumniSystemList   = (params = {}) => api.get("/alumni-system",      { params });
export const getAlumniSystemRecord = (id)          => api.get(`/alumni-system/${id}`);

export default api;