import React, { createContext, useContext, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {  loginRequest, 
          fetchCurrentUser, 
          logoutRequest } from "../services/authService";


const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  const storedToken = localStorage.getItem("token");
  const storedUser = localStorage.getItem("user");

  const [token, setToken] = useState(storedToken || null);
  const [user, setUser] = useState(
  storedUser ? JSON.parse(storedUser) : null
);

  useEffect(() => {

  const initializeAuth = async () => {
    const token = localStorage.getItem("token");

    if (!token) {
      setLoading(false);
      return;
    }

    try {
      const res = await fetchCurrentUser();
      setUser(res.data);
    } catch {
      logoutRequest();
    }

    setLoading(false);
  };

  initializeAuth();

}, []);

  // Login
  const login = async (email, password) => {
    try {
      // Authenticate
      const res = await loginRequest(email, password);

      const tokenFromServer = res.data.token;

      localStorage.setItem("token", tokenFromServer);
      setToken(tokenFromServer);

      // Fetch authenticated user (single source of truth)
      const userRes = await fetchCurrentUser();
      const userData = userRes.data;

      localStorage.setItem("user", JSON.stringify(userData));
      setUser(userData);

    } catch (error) {
      const status = error.response?.status;

      if (status === 401) {
        alert("Invalid credentials");
      } else {
        alert("Login failed. Please try again.");
      }

      throw error;
    }
  };

  const logout = async () => {
      try {
      await logoutRequest(); // revoke server token
    } catch (err) {
      console.error("Logout request failed:", err);
    }
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    setUser(null);
    setToken(null);

    navigate("/", { replace: true });
  };

  return (
    <AuthContext.Provider value={{ user, loading, token, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);