import api from "../services/api";

export const fetchCurrentUser = () => api.get("/me");

export const ssoCallbackRequest = (code) => api.post("/auth/callback", { code });

export const logoutRequest = async () => {
  const response = await api.post("/logout");
  const logoutUrl = response.data?.logout_url;

  if (logoutUrl) {
    window.location.href = logoutUrl;  // Redirects to IdP to clear SSO session
  } else {
    window.location.href = "/";
  }
};