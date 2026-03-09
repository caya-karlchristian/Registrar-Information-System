import api from "../services/api";

export const loginRequest = (email, password) => {
  return api.post("/login", { email, password });
};

export const fetchCurrentUser = () => {
  return api.get("/me");
};

export const logoutRequest = () => {
  return api.post("/logout");
};