import api from "../services/api";

export const fetchCurrentUser = () => api.get("/me");

export const ssoCallbackRequest = (code) => api.post("/auth/callback", { code });

export const logoutRequest = async () => {
  await api.post("/logout");
  window.location.href = `${import.meta.env.VITE_SSO_BASE_URL}/api/v1/auth/logout?client_id=${import.meta.env.VITE_SSO_CLIENT_ID}`;
};
