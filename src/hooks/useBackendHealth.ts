// src/hooks/useBackendHealth.ts

import { useState, useEffect, useCallback } from "react";

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";
const HEALTH_URL = `${BASE_URL}/health`;
const POLL_MS = 15_000; // check every 15s

export type BackendStatus = "online" | "offline" | "checking";

export function useBackendHealth(): BackendStatus {
  const [status, setStatus] = useState<BackendStatus>("checking");

  const check = useCallback(async () => {
    console.log(`[health] checking → ${HEALTH_URL}`);
    try {
      const res = await fetch(HEALTH_URL, {
        method: "GET",
        signal: AbortSignal.timeout(4000),
      });

      if (res.ok) {
        console.log("[health] ✅ online");
        setStatus("online");
      } else {
        // e.g. 404 means /health route doesn't exist on the backend
        console.warn(
          `[health] ❌ HTTP ${res.status} — add a /health route to your FastAPI app`,
        );
        setStatus("offline");
      }
    } catch (err: unknown) {
      // Two common causes:
      //  • TypeError: Failed to fetch  → CORS blocked or network unreachable
      //  • AbortError                  → took longer than 4 s
      const isAbort = err instanceof Error && err.name === "AbortError";
      console.warn(
        isAbort
          ? "[health] ❌ timeout — server didn't respond in 4 s"
          : `[health] ❌ fetch failed — ${String(err)}\n` +
              "  Likely causes:\n" +
              "  1) CORS not enabled on FastAPI (add CORSMiddleware)\n" +
              "  2) Port 8000 is firewalled on the remote machine\n" +
              "  3) VITE_API_BASE_URL is wrong — currently: " +
              BASE_URL,
      );
      setStatus("offline");
    }
  }, []);

  useEffect(() => {
    check();
    const id = setInterval(check, POLL_MS);
    return () => clearInterval(id);
  }, [check]);

  return status;
}
