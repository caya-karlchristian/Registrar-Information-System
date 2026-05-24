import api from "../services/api";

export const fetchCurrentUser = () => api.get("/me");

export const ssoCallbackRequest = (code) => api.post("/auth/callback", { code });

/**
 * localLoginRequest — always authenticates against the local bcrypt hash.
 * Use this when the IDP is known to be down (user clicks "Use Local Login").
 */
export const localLoginRequest = (email, password) =>
  api.post("/auth/local-login", { email, password });

export const logoutRequest = async () => {
  // Defer navigation by one tick so the current React render cycle finishes.
  try {
    const response  = await api.post("/logout");
    const logoutUrl = response.data?.logout_url;
    setTimeout(() => { window.location.href = logoutUrl || "/"; }, 0);
  } catch {
    // Backend unreachable — still navigate home so the user is never trapped.
    setTimeout(() => { window.location.href = "/"; }, 0);
  }
};
