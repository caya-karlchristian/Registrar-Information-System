import api from "../services/API";

export const loginRequest = (email, password) => {
  return api.post("/login", { email, password });
};

export const fetchCurrentUser = () => {
  return api.get("/me");
};

export const logoutRequest = () => {
  return api.post("/logout");
};