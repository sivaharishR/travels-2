import { useSyncExternalStore } from "react";

// Tiny SSR-safe session store for the admin token, backed by sessionStorage.
// useSyncExternalStore keeps the server snapshot (null) and client snapshot
// in sync without calling setState inside effects (which React hooks lint forbids).

const KEY = "quickcab_admin_token";

const listeners = new Set<() => void>();

export function getAdminToken(): string | null {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem(KEY);
}

export function setAdminToken(token: string | null): void {
  if (token) {
    sessionStorage.setItem(KEY, token);
  } else {
    sessionStorage.removeItem(KEY);
  }
  listeners.forEach((l) => l());
}

function subscribe(callback: () => void): () => void {
  listeners.add(callback);
  return () => {
    listeners.delete(callback);
  };
}

function getServerSnapshot(): string | null {
  return null;
}

export function useAdminSession(): string | null {
  return useSyncExternalStore(subscribe, getAdminToken, getServerSnapshot);
}
