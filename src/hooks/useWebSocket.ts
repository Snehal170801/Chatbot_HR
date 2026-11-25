// src/hooks/useWebSocket.ts

import { useRef, useCallback, useEffect } from "react";
import type {
  WsIncomingMessage,
  WsOutgoingMessage,
  WsInitPayload,
} from "../types/interview";

// ─── Config ───────────────────────────────────────────────────────────────────

// Empty VITE_WS_BASE_URL → same origin (wss on https), via the Vite proxy
const WS_BASE =
  import.meta.env.VITE_WS_BASE_URL ||
  `${location.protocol === "https:" ? "wss" : "ws"}://${location.host}`;

const WS_URL =
  WS_BASE +
  (import.meta.env.VITE_WS_INTERVIEW ?? "/ws");

// ─── Hook Options ─────────────────────────────────────────────────────────────

export interface UseWebSocketOptions {
  onMessage: (msg: WsIncomingMessage) => void;
  onOpen?: () => void;
  onClose?: () => void;
  onError?: (e: Event) => void;
}

// ─── Hook Return ──────────────────────────────────────────────────────────────

export interface UseWebSocketReturn {
  connect: (jd_b64: string, resume_b64: string, job_title: string) => void;
  disconnect: () => void;
  sendRaw: (payload: WsOutgoingMessage) => void;
  isConnected: () => boolean;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useWebSocket(options: UseWebSocketOptions): UseWebSocketReturn {
  const wsRef = useRef<WebSocket | null>(null);

  // Keep callbacks in refs so we never stale-close over them
  const onMessageRef = useRef(options.onMessage);
  const onOpenRef = useRef(options.onOpen);
  const onCloseRef = useRef(options.onClose);
  const onErrorRef = useRef(options.onError);

  // Sync refs every render so callers never need to worry about stale closures
  useEffect(() => {
    onMessageRef.current = options.onMessage;
  }, [options.onMessage]);
  useEffect(() => {
    onOpenRef.current = options.onOpen;
  }, [options.onOpen]);
  useEffect(() => {
    onCloseRef.current = options.onClose;
  }, [options.onClose]);
  useEffect(() => {
    onErrorRef.current = options.onError;
  }, [options.onError]);

  // ── sendRaw ────────────────────────────────────────────────────────────────
  const sendRaw = useCallback((payload: WsOutgoingMessage) => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      console.warn("[WS] sendRaw called but socket not open", payload.type);
      return;
    }
    ws.send(JSON.stringify(payload));
  }, []);

  // ── isConnected ────────────────────────────────────────────────────────────
  const isConnected = useCallback(() => {
    return wsRef.current?.readyState === WebSocket.OPEN;
  }, []);

  // ── disconnect ─────────────────────────────────────────────────────────────
  const disconnect = useCallback(() => {
    const ws = wsRef.current;
    if (!ws) return;

    // Remove listeners before closing so onClose doesn't fire externally
    ws.onopen = null;
    ws.onmessage = null;
    ws.onerror = null;
    ws.onclose = null;

    if (
      ws.readyState === WebSocket.OPEN ||
      ws.readyState === WebSocket.CONNECTING
    ) {
      ws.close(1000, "user disconnected");
    }

    wsRef.current = null;
    console.log("[WS] disconnected");
  }, []);

  // ── connect ────────────────────────────────────────────────────────────────
  const connect = useCallback(
    (jd_b64: string, resume_b64: string, job_title: string = "") => {
      // ← added job_title
      // Tear down any existing socket first
      disconnect();

      console.log("[WS] connecting to", WS_URL);
      const ws = new WebSocket(WS_URL);
      wsRef.current = ws;

      // ── onopen ──────────────────────────────────────────────────────────
      ws.onopen = () => {
        console.log("[WS] connected");

        // First thing the backend expects is the init payload
        const initPayload: WsInitPayload = {
          type: "init",
          jd_b64,
          resume_b64,
          job_title,
        };
        ws.send(JSON.stringify(initPayload));
        console.log(
          "[WS] init payload sent — job_title:",
          job_title || "(none)",
        );

        onOpenRef.current?.();
      };

      // ── onmessage ───────────────────────────────────────────────────────
      ws.onmessage = (event: MessageEvent) => {
        let parsed: WsIncomingMessage;

        try {
          parsed = JSON.parse(event.data as string) as WsIncomingMessage;
        } catch (err) {
          console.error("[WS] failed to parse message", event.data, err);
          return;
        }

        // Log everything except audio deltas (too noisy)
        if (parsed.type !== "response.output_audio.delta") {
          console.log("[WS] ←", parsed.type, parsed);
        }

        onMessageRef.current(parsed);
      };

      // ── onerror ─────────────────────────────────────────────────────────
      ws.onerror = (e: Event) => {
        console.error("[WS] error", e);
        onErrorRef.current?.(e);
      };

      // ── onclose ─────────────────────────────────────────────────────────
      ws.onclose = (e: CloseEvent) => {
        console.log("[WS] closed — code:", e.code, "reason:", e.reason);
        wsRef.current = null;
        onCloseRef.current?.();
      };
    },
    [disconnect],
  );

  // ── Cleanup on unmount ─────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return { connect, disconnect, sendRaw, isConnected };
}
