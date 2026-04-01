import api from "../services/api";

export const fetchCurrentUser = () => {
  return api.get("/me");
};

export const logoutRequest = () => {
  return api.post("/logout");
};

export const ssoCallbackRequest = (code) => api.post("/auth/callback", { code });
