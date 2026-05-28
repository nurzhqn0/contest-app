import {
  createContext,
  PropsWithChildren,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { api } from "./api";
import { Organizer } from "./types";

type AuthStatus = "loading" | "authenticated" | "anonymous";

type AuthContextValue = {
  organizer: Organizer | null;
  status: AuthStatus;
  refreshAuth: () => Promise<void>;
  signIn: (payload: { username: string; password: string }) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

async function fetchCurrentOrganizer() {
  return api.get<Organizer>("/auth/me", false, {
    suppressUnauthorizedEvent: true,
  });
}

export function AuthProvider({ children }: PropsWithChildren) {
  const [organizer, setOrganizer] = useState<Organizer | null>(null);
  const [status, setStatus] = useState<AuthStatus>("loading");

  async function refreshAuth() {
    setStatus("loading");
    try {
      const currentOrganizer = await fetchCurrentOrganizer();
      setOrganizer(currentOrganizer);
      setStatus("authenticated");
    } catch {
      setOrganizer(null);
      setStatus("anonymous");
    }
  }

  async function signIn(payload: { username: string; password: string }) {
    await api.post("/auth/login", payload, false, {
      suppressUnauthorizedEvent: true,
    });
    const currentOrganizer = await fetchCurrentOrganizer();
    setOrganizer(currentOrganizer);
    setStatus("authenticated");
  }

  async function signOut() {
    try {
      await api.post("/auth/logout", {}, false, {
        suppressUnauthorizedEvent: true,
      });
    } finally {
      setOrganizer(null);
      setStatus("anonymous");
    }
  }

  useEffect(() => {
    void refreshAuth();
  }, []);

  useEffect(() => {
    function handleUnauthorized() {
      setOrganizer(null);
      setStatus("anonymous");
    }

    window.addEventListener("auth:unauthorized", handleUnauthorized);
    return () =>
      window.removeEventListener("auth:unauthorized", handleUnauthorized);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      organizer,
      status,
      refreshAuth,
      signIn,
      signOut,
    }),
    [organizer, status],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
