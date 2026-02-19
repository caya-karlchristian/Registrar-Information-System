import axios from "axios";

// Base URL of Laravel backend
const API_BASE_URL = "http://127.0.0.1:8000/api";

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

//  SYSTEM USERS 
export const getSystemUsers = () => api.get("/system-users");
export const getSystemUser = (id) => api.get(`/system-users/${id}`);
export const createSystemUser = (data) => api.post("/system-users", data);
export const updateSystemUser = (id, data) => api.put(`/system-users/${id}`, data);
export const deleteSystemUser = (id) => api.delete(`/system-users/${id}`);

//  STUDENTS 
export const getStudents = () => api.get("/students");
export const getStudent = (id) => api.get(`/students/${id}`);
export const createStudent = (data) => api.post("/students", data);
export const updateStudent = (id, data) => api.put(`/students/${id}`, data);
export const deleteStudent = (id) => api.delete(`/students/${id}`);

// ------------------- ACADEMIC RECORDS -------------------
export const getAcademicRecords = () => api.get("/academic-records");
export const getAcademicRecord = (id) => api.get(`/academic-records/${id}`);
export const createAcademicRecord = (data) => api.post("/academic-records", data);
export const updateAcademicRecord = (id, data) => api.put(`/academic-records/${id}`, data);
export const deleteAcademicRecord = (id) => api.delete(`/academic-records/${id}`);

// ------------------- REQUEST STATUSES -------------------
export const getRequestStatuses = () => api.get("/request-statuses");
export const getRequestStatus = (id) => api.get(`/request-statuses/${id}`);
export const createRequestStatus = (data) => api.post("/request-statuses", data);
export const updateRequestStatus = (id, data) => api.put(`/request-statuses/${id}`, data);
export const deleteRequestStatus = (id) => api.delete(`/request-statuses/${id}`);

// ------------------- DOCUMENT TYPES -------------------
export const getDocumentTypes = () => api.get("/document-types");
export const getDocumentType = (id) => api.get(`/document-types/${id}`);
export const createDocumentType = (data) => api.post("/document-types", data);
export const updateDocumentType = (id, data) => api.put(`/document-types/${id}`, data);
export const deleteDocumentType = (id) => api.delete(`/document-types/${id}`);

// ------------------- CERTIFICATIONS -------------------
export const getCertifications = () => api.get("/certifications");
export const getCertification = (id) => api.get(`/certifications/${id}`);
export const createCertification = (data) => api.post("/certifications", data);
export const updateCertification = (id, data) => api.put(`/certifications/${id}`, data);
export const deleteCertification = (id) => api.delete(`/certifications/${id}`);

// DOCUMENT REQUESTS 
export const getDocumentRequests = () => api.get("/document-requests");
export const getDocumentRequest = (id) => api.get(`/document-requests/${id}`);
export const createDocumentRequest = (data) => api.post("/document-requests", data);
export const updateDocumentRequest = (id, data) => api.put(`/document-requests/${id}`, data);
export const deleteDocumentRequest = (id) => api.delete(`/document-requests/${id}`);

//  REQUEST DOCUMENTS 
export const getRequestDocuments = () => api.get("/request-documents");
export const getRequestDocument = (id) => api.get(`/request-documents/${id}`);
export const createRequestDocument = (data) => api.post("/request-documents", data);
export const updateRequestDocument = (id, data) => api.put(`/request-documents/${id}`, data);
export const deleteRequestDocument = (id) => api.delete(`/request-documents/${id}`);

//  REQUEST HISTORY 
export const getRequestHistory = () => api.get("/request-history");
export const getRequestHistoryItem = (id) => api.get(`/request-history/${id}`);
export const createRequestHistoryItem = (data) => api.post("/request-history", data);
export const updateRequestHistoryItem = (id, data) => api.put(`/request-history/${id}`, data);
export const deleteRequestHistoryItem = (id) => api.delete(`/request-history/${id}`);

export const loginUser = (data) => api.post("/login", data);

export default api;
