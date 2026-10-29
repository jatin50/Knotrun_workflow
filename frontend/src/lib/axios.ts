import axios from "axios";

// Normalize API URL to handle trailing slashes and enable same-origin fallback
const rawApiUrl = (import.meta.env.VITE_API_URL as string | undefined)?.trim() ?? "";
const cleanBaseUrl = rawApiUrl.endsWith("/") ? rawApiUrl.slice(0, -1) : rawApiUrl;

const api = axios.create({
  baseURL: cleanBaseUrl || (typeof window !== "undefined" ? "" : "http://localhost:4000"),
  withCredentials: true, // Send httpOnly accessToken/refreshToken cookies
  headers: {
    "Content-Type": "application/json",
  },
});

export default api;
