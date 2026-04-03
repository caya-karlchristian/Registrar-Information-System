import axios from "axios";

// -------------------------------------------------------
// Single axios instance for the entire app.
// Token injection and 401 handling are done here once —
// every service file imports this instance, never creates its own.
// -------------------------------------------------------
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? "http://localhost:8000/api",
  headers: {
    Accept: "application/json",
    "Content-Type": "application/json",
  },
});

// Attach Bearer token to every request automatically
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// On 401 — clear local storage so stale sessions don't persist.
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
export const getSystemUsers = () => api.get("/system-users");
export const getSystemUser = (id) => api.get(`/system-users/${id}`);
export const createSystemUser = (data) => api.post("/system-users", data);
export const updateSystemUser = (id, data) => api.put(`/system-users/${id}`, data);
export const deleteSystemUser = (id) => api.delete(`/system-users/${id}`);

// -------------------------------------------------------
// STUDENTS (Admin + Super Admin)
// -------------------------------------------------------
export const getStudents = () => api.get("/students");
export const getStudent = (id) => api.get(`/students/${id}`);
export const createStudent = (data) => api.post("/students", data);
export const updateStudent = (id, data) => api.put(`/students/${id}`, data);
export const deleteStudent = (id) => api.delete(`/students/${id}`);

// -------------------------------------------------------
// ACADEMIC RECORDS (Admin + Super Admin)
// -------------------------------------------------------
export const getAcademicRecords = () => api.get("/academic-records");
export const getAcademicRecord = (id) => api.get(`/academic-records/${id}`);
export const createAcademicRecord = (data) => api.post("/academic-records", data);
export const updateAcademicRecord = (id, data) => api.put(`/academic-records/${id}`, data);
export const deleteAcademicRecord = (id) => api.delete(`/academic-records/${id}`);

// -------------------------------------------------------
// REQUEST STATUSES (Admin + Super Admin)
// -------------------------------------------------------
export const getRequestStatuses = () => api.get("/request-statuses");
export const getRequestStatus = (id) => api.get(`/request-statuses/${id}`);
export const createRequestStatus = (data) => api.post("/request-statuses", data);
export const updateRequestStatus = (id, data) => api.put(`/request-statuses/${id}`, data);
export const deleteRequestStatus = (id) => api.delete(`/request-statuses/${id}`);

// -------------------------------------------------------
// DOCUMENT TYPES (read: all | write: Admin + Super Admin)
// -------------------------------------------------------
export const getDocumentTypes = () => api.get("/document-types");
export const getDocumentType = (id) => api.get(`/document-types/${id}`);
export const createDocumentType = (data) => api.post("/document-types", data);
export const updateDocumentType = (id, data) => api.put(`/document-types/${id}`, data);
export const deleteDocumentType = (id) => api.delete(`/document-types/${id}`);

// -------------------------------------------------------
// CERTIFICATIONS (read: all | write: Admin + Super Admin)
// -------------------------------------------------------
export const getCertifications = () => api.get("/certifications");
export const getCertification = (id) => api.get(`/certifications/${id}`);
export const createCertification = (data) => api.post("/certifications", data);
export const updateCertification = (id, data) => api.put(`/certifications/${id}`, data);
export const deleteCertification = (id) => api.delete(`/certifications/${id}`);
export const getCertificationLayouts = () => api.get("/certifications/layouts");
export const updateCertificationLayout = (id, data) => api.put(`/certifications/${id}/layout`, data);
export const uploadCertificationLayoutLogo = (id, formData) =>
  api.post(`/certifications/${id}/layout/logo`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });

// -------------------------------------------------------
// DOCUMENT REQUESTS (read: all | write: Student/Alumni | manage: Admin+)
// -------------------------------------------------------
export const getDocumentRequests = () => api.get("/document-requests");
export const getDocumentRequest = (id) => api.get(`/document-requests/${id}`);
export const createDocumentRequest = (data) => api.post("/document-requests", data);
export const updateDocumentRequest = (id, data) => api.put(`/document-requests/${id}`, data);
export const deleteDocumentRequest = (id) => api.delete(`/document-requests/${id}`);

// -------------------------------------------------------
// REQUEST DOCUMENTS (many-to-many: request ↔ document type)
// -------------------------------------------------------
export const getRequestDocuments = () => api.get("/request-documents");
export const getRequestDocument = (id) => api.get(`/request-documents/${id}`);
export const createRequestDocument = (data) => api.post("/request-documents", data);
export const updateRequestDocument = (id, data) => api.put(`/request-documents/${id}`, data);
export const deleteRequestDocument = (id) => api.delete(`/request-documents/${id}`);

// -------------------------------------------------------
// REQUEST HISTORY (read: all | write: Admin+)
// -------------------------------------------------------
export const getRequestHistory = () => api.get("/request-history");
export const getRequestHistoryItem = (id) => api.get(`/request-history/${id}`);
export const createRequestHistoryItem = (data) => api.post("/request-history", data);
export const updateRequestHistoryItem = (id, data) => api.put(`/request-history/${id}`, data);
export const deleteRequestHistoryItem = (id) => api.delete(`/request-history/${id}`);

// -------------------------------------------------------
// AUDIT LOGS (Super Admin only)
// -------------------------------------------------------
export const getAuditLogs = (params = {}) => api.get("/audit-logs", { params });
export const getAuditLogFilters = () => api.get("/audit-logs/filters");

export default api;