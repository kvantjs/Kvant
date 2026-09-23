import { useCallback, useState } from "react";

type UseAuthOptions = { redirectOnUnauthenticated?: boolean; redirectPath?: string };

const STORAGE_KEY = "kvant-local-session";

export function useAuth(_options?: UseAuthOptions) {
  const [isAuthenticated, setAuthenticated] = useState(() => {
    if (typeof window === "undefined") return true;
    return localStorage.getItem(STORAGE_KEY) !== "signed-out";
  });

  const logout = useCallback(async () => {
    localStorage.setItem(STORAGE_KEY, "signed-out");
    setAuthenticated(false);
  }, []);

  return {
    user: isAuthenticated ? { name: "Local workspace", email: null } : null,
    loading: false,
    error: null,
    isAuthenticated,
    refresh: async () => undefined,
    logout,
  };
}
