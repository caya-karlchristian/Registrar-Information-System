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

// Example API calls

// System Users
export const getSystemUsers = () => api.get("/system-users");
export const getSystemUser = (id) => api.get(`/system-users/${id}`);
export const createSystemUser = (data) => api.post("/system-users", data);
export const updateSystemUser = (id, data) => api.put(`/system-users/${id}`, data);
export const deleteSystemUser = (id) => api.delete(`/system-users/${id}`);

// Students
export const getStudents = () => api.get("/students");
export const getStudent = (id) => api.get(`/students/${id}`);
export const createStudent = (data) => api.post("/students", data);
export const updateStudent = (id, data) => api.put(`/students/${id}`, data);
export const deleteStudent = (id) => api.delete(`/students/${id}`);

// You can add similar functions for other resources (documents, requests, etc.)

export default api;
    