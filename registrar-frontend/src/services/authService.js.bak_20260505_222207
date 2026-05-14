import api from "../services/api";

export const fetchCurrentUser = () => api.get("/me");

export const ssoCallbackRequest = (code) => api.post("/auth/callback", { code });

export const logoutRequest = async () => {
  const response = await api.post("/logout");
  const logoutUrl = response.data?.logout_url;

  // Defer the hard-navigation by one tick so the current React render
  // cycle (including Router cleanup effects) finishes before the document
  // is replaced.  Without this, Chromium logs:
  //   "Prevented <url> from accessing QueryParameters"
  // because the Router's location subscription still holds a reference
  // to the old document when window.location.href is set synchronously.
  if (logoutUrl) {
    setTimeout(() => { window.location.href = logoutUrl; }, 0);
  } else {
    setTimeout(() => { window.location.href = "/"; }, 0);
  }
};