import api from "../services/api";

export const fetchCurrentUser = () => api.get("/me");

export const logoutRequest = () => api.post("/logout");

export const ssoCallbackRequest = (code) => api.post("/auth/callback", { code });