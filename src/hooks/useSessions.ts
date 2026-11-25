// src/hooks/useSessions.ts

import { useState, useEffect, useCallback } from "react";
import type { Session } from "../types/interview";

// ─── Config ───────────────────────────────────────────────────────────────────
const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8008";
const SESSIONS_PATH = import.meta.env.VITE_API_SESSIONS ?? "/api/sessions";
const SESSIONS_URL = `${BASE_URL}${SESSIONS_PATH}`;

// ─── Hook Return ──────────────────────────────────────────────────────────────

export interface UseSessionsReturn {
  sessions: Session[];
  loading: boolean;
  error: string | null;
  refresh: () => void;
  error:string|null;
}


// ─── Hook ─────────────────────────────────────────────────────────────────────
export function useSessions(): UseSessionsReturn {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSessions = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(SESSIONS_URL);

      if (!res.ok) {
        throw new Error(`Server returned ${res.status}`);
      }

      const data = await res.json();

      // Handle both { sessions: [...] } and bare array responses
      const list: Session[] = Array.isArray(data)
        ? data
        : Array.isArray(data.sessions)
          ? data.sessions
          : [];

      setSessions(list);
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Failed to fetch sessions";
      setError(msg);
      console.error("[useSessions]", msg);
    } finally {
      setLoading(false);
    }
  }, []);
// Fetch on mount
  useEffect(() => {
  
    fetchSessions();
  }, [fetchSessions]);
  return { sessions, loading, error, refresh: fetchSessions };
}
