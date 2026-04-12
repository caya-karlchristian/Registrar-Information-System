// import axios from "axios";

// const axiosInstance = axios.create({
//   baseURL: import.meta.env.VITE_API_URL ?? "https://localhost/api",
//   headers: {
//     Accept: "application/json",
//     "Content-Type": "application/json"
//   }
// });

// export default axiosInstance;
import axios from "axios";

const axiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? "https://localhost/api",
  headers: {
    Accept: "application/json",
    "Content-Type": "application/json"
  }
});

// Attach token on every request — reads from storage at call time, not module load
axiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Optional but useful: auto-handle 401s (token expired/invalid)
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("token");
      // Redirect to SSO login or your app's entry point
      window.location.href = "/";
    }
    return Promise.reject(error);
  }
);

export default axiosInstance;   