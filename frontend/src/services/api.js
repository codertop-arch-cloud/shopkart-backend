import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "",
  withCredentials: true,
});

// Request interceptor to attach Authorization header if token is stored in localStorage
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token && !config.headers.Authorization) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export default api;
