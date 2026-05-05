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
