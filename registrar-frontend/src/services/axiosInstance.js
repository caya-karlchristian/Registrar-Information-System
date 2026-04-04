import axios from "axios";

const axiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? "https://localhost/api",
  headers: {
    Accept: "application/json",
    "Content-Type": "application/json"
  }
});

export default axiosInstance;