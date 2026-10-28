import { create } from "zustand";
import api from "../lib/axios";

export interface User {
  id: string;
  name: string;
  email: string;
}

interface AuthState {
  user: User | null;
  status: "idle" | "loading" | "authenticated" | "unauthenticated";
  error: string | null;
  register: (name: string, email: string, password: string) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  loginAsGuest: () => Promise<{ user: User; workspaceId?: string }>;
  logout: () => Promise<void>;
  fetchMe: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  status: "idle",
  error: null,

  register: async (name, email, password) => {
    set({ status: "loading", error: null });
    try {
      const { data } = await api.post("/api/auth/register", { name, email, password });
      set({ user: data.user, status: "authenticated" });
    } catch (err) {
      set({ status: "unauthenticated", error: extractErrorMessage(err) });
      throw err;
    }
  },

  login: async (email, password) => {
    set({ status: "loading", error: null });
    try {
      const { data } = await api.post("/api/auth/login", { email, password });
      set({ user: data.user, status: "authenticated" });
    } catch (err) {
      set({ status: "unauthenticated", error: extractErrorMessage(err) });
      throw err;
    }
  },

  loginAsGuest: async () => {
    set({ status: "loading", error: null });
    try {
      const { data } = await api.post("/api/auth/guest");
      set({ user: data.user, status: "authenticated" });
      return data;
    } catch (err) {
      set({ status: "unauthenticated", error: extractErrorMessage(err) });
      throw err;
    }
  },

  logout: async () => {
    await api.post("/api/auth/logout");
    set({ user: null, status: "unauthenticated" });
  },

  fetchMe: async () => {
    set({ status: "loading" });
    try {
      const { data } = await api.get("/api/auth/me");
      set({ user: data.user, status: "authenticated" });
    } catch {
      set({ user: null, status: "unauthenticated" });
    }
  },
}));

function extractErrorMessage(err: unknown): string {
  if (
    typeof err === "object" &&
    err !== null &&
    "response" in err &&
    typeof (err as { response?: { data?: { error?: string } } }).response?.data?.error === "string"
  ) {
    return (err as { response: { data: { error: string } } }).response.data.error;
  }
  return "Something went wrong. Please try again.";
}
