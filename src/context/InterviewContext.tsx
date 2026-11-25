// src/context/InterviewContext.tsx

import {
  createContext,
  useContext,
  useReducer,
  useCallback,
  useRef,
  type ReactNode,
} from "react";

import { useWebSocket } from "../hooks/useWebSocket";
import { useAudioEngine } from "../hooks/useAudioEngine";

import type {
  InterviewStatus,
  InterviewState,
  InterviewFiles,
  ChatMessage,
  EvaluationReport, // ← NEW
  WsIncomingMessage,
  WsAudioAppendPayload,
  WsOutgoingMessage,
} from "../types/interview";

// ─── API config ───────────────────────────────────────────────────────────────

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8008";

// ─── Context Shape ────────────────────────────────────────────────────────────

interface InterviewContextValue extends InterviewState {
  files: InterviewFiles;
  evaluationReport: EvaluationReport | null; // ← NEW
  isEvaluating: boolean; // ← NEW
  setJd: (name: string, b64: string, sizeKb: number) => void;
  setResume: (name: string, b64: string, sizeKb: number) => void;
  setJobTitle: (title: string) => void;
  startInterview: () => void;
  endInterview: () => void;
  dismissReport: () => void; // ← NEW: close the report modal
  toggleMute: () => void;
  sendTextMessage: (text: string) => void;
}

// ─── State Shape ──────────────────────────────────────────────────────────────

interface FullState {
  interview: InterviewState;
  files: InterviewFiles;
  jobTitle: string;
  evaluationReport: EvaluationReport | null; // ← NEW
  isEvaluating: boolean; // ← NEW
}

// ─── Actions ──────────────────────────────────────────────────────────────────

type Action =
  | { type: "SET_STATUS"; status: InterviewStatus }
  | { type: "SET_SESSION_ID"; sessionId: string }
  | { type: "SET_ERROR"; message: string }
  | { type: "TOGGLE_MUTE" }
  | { type: "ADD_MESSAGE"; message: ChatMessage }
  | { type: "APPEND_ARIA_TEXT"; itemId: string; delta: string }
  | { type: "FINALISE_ARIA_MSG"; itemId: string; transcript: string }
  | { type: "RESET_MESSAGES" }
  | { type: "SET_JD"; name: string; b64: string; sizeKb: number }
  | { type: "SET_RESUME"; name: string; b64: string; sizeKb: number }
  | { type: "SET_JOB_TITLE"; title: string }
  | { type: "SET_EVALUATING"; value: boolean } // ← NEW
  | { type: "SET_EVALUATION"; report: EvaluationReport } // ← NEW
  | { type: "DISMISS_REPORT" }; // ← NEW

// ─── Initial State ────────────────────────────────────────────────────────────

const INITIAL_STATE: FullState = {
  interview: {
    status: "idle",
    messages: [],
    sessionId: null,
    isMuted: false,
    errorMessage: null,
  },
  files: {
    jd: null,
    resume: null,
  },
  jobTitle: "",
  evaluationReport: null, // ← NEW
  isEvaluating: false, // ← NEW
};

// ─── Reducer ──────────────────────────────────────────────────────────────────

function reducer(state: FullState, action: Action): FullState {
  const { interview, files } = state;

  switch (action.type) {
    case "SET_STATUS":
      return {
        ...state,
        interview: { ...interview, status: action.status, errorMessage: null },
      };

    case "SET_SESSION_ID":
      return {
        ...state,
        interview: { ...interview, sessionId: action.sessionId },
      };

    case "SET_ERROR":
      return {
        ...state,
        interview: {
          ...interview,
          status: "error",
          errorMessage: action.message,
        },
      };

    case "TOGGLE_MUTE":
      return {
        ...state,
        interview: { ...interview, isMuted: !interview.isMuted },
      };

    case "ADD_MESSAGE":
      return {
        ...state,
        interview: {
          ...interview,
          messages: [...interview.messages, action.message],
        },
      };

    case "APPEND_ARIA_TEXT": {
      const msgs = interview.messages;
      const existing = msgs.findIndex(
        (m) => m.id === action.itemId && m.isPartial,
      );

      if (existing !== -1) {
        const updated = msgs.map((m, i) =>
          i === existing ? { ...m, text: m.text + action.delta } : m,
        );
        return { ...state, interview: { ...interview, messages: updated } };
      }

      const newMsg: ChatMessage = {
        id: action.itemId,
        role: "aria",
        text: action.delta,
        timestamp: Date.now(),
        isPartial: true,
      };
      return {
        ...state,
        interview: { ...interview, messages: [...msgs, newMsg] },
      };
    }

    case "FINALISE_ARIA_MSG": {
      const updated = interview.messages.map((m) =>
        m.id === action.itemId
          ? { ...m, text: action.transcript, isPartial: false }
          : m,
      );
      return { ...state, interview: { ...interview, messages: updated } };
    }

    case "RESET_MESSAGES":
      return {
        ...state,
        interview: { ...interview, messages: [], sessionId: null },
      };

    case "SET_JD":
      return {
        ...state,
        files: {
          ...files,
          jd: { name: action.name, b64: action.b64, sizeKb: action.sizeKb },
        },
      };

    case "SET_RESUME":
      return {
        ...state,
        files: {
          ...files,
          resume: { name: action.name, b64: action.b64, sizeKb: action.sizeKb },
        },
      };

    case "SET_JOB_TITLE":
      return { ...state, jobTitle: action.title };

    // ── NEW ──────────────────────────────────────────────────────────────────

    case "SET_EVALUATING":
      return { ...state, isEvaluating: action.value };

    case "SET_EVALUATION":
      return { ...state, evaluationReport: action.report, isEvaluating: false };

    case "DISMISS_REPORT":
      return { ...state, evaluationReport: null };

    default:
      return state;
  }
}

// ─── Context ──────────────────────────────────────────────────────────────────

const InterviewContext = createContext<InterviewContextValue | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────────────

export function InterviewProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, INITIAL_STATE);

  const isMutedRef = useRef(false);
  isMutedRef.current = state.interview.isMuted;

  const sendRawRef = useRef<(payload: WsOutgoingMessage) => void>(() => {
    console.warn("[WS] sendRaw called before socket is ready");
  });

  const stopPlaybackRef = useRef<() => void>(() => {});

  // ── Keep a ref to the backend session ID so endInterview() can read it
  // after RESET_MESSAGES has already nulled state.interview.sessionId ────────
  const backendSessionIdRef = useRef<string | null>(null);

  // ── Handle incoming WS messages ──────────────────────────────────────────
  const handleMessage = useCallback((msg: WsIncomingMessage) => {
    switch (msg.type) {
      // ── NEW: backend sends this BEFORE session.created ───────────────────
      // This UUID is what /api/evaluate/{id} and /api/sessions/{id} expect.
      case "session.assigned":
        backendSessionIdRef.current = msg.id;
        dispatch({ type: "SET_SESSION_ID", sessionId: msg.id });
        break;

      // Azure/OpenAI session — we only use this to flip status to "ready".
      // Do NOT overwrite sessionId here; the backend UUID is what matters.
      case "session.created":
        dispatch({ type: "SET_STATUS", status: "ready" });
        break;

      case "session.updated":
        break;

      case "input_audio_buffer.speech_started":
        dispatch({ type: "SET_STATUS", status: "listening" });
        stopPlaybackRef.current();
        break;

      case "input_audio_buffer.speech_stopped":
        break;

      case "response.created":
        dispatch({ type: "SET_STATUS", status: "speaking" });
        break;

      case "response.output_audio.delta":
        playAudioChunkRef.current(msg.delta);
        break;

      case "response.output_audio_transcript.delta":
        dispatch({
          type: "APPEND_ARIA_TEXT",
          itemId: msg.item_id,
          delta: msg.delta,
        });
        break;

      case "response.output_audio_transcript.done":
        dispatch({
          type: "FINALISE_ARIA_MSG",
          itemId: msg.item_id,
          transcript: msg.transcript,
        });
        break;

      case "conversation.item.input_audio_transcription.completed":
        dispatch({
          type: "ADD_MESSAGE",
          message: {
            id: msg.item_id,
            role: "user",
            text: msg.transcript,
            timestamp: Date.now(),
            isPartial: false,
          },
        });
        break;

      case "response.done":
        dispatch({ type: "SET_STATUS", status: "ready" });
        break;

      case "error":
        dispatch({ type: "SET_ERROR", message: msg.error.message });
        console.error("[Interview] server error", msg.error);
        break;
    }
  }, []);

  // ── Audio chunk callback ──────────────────────────────────────────────────
  const handleAudioChunk = useCallback((payload: WsAudioAppendPayload) => {
    if (isMutedRef.current) return;
    sendRawRef.current(payload);
  }, []);

  // ── Audio engine ──────────────────────────────────────────────────────────
  const audioEngine = useAudioEngine({ onAudioChunk: handleAudioChunk });

  const playAudioChunkRef = useRef<(b64: string) => void>(() => {});

  // ── WebSocket hook ────────────────────────────────────────────────────────
  const wsHook = useWebSocket({
    onMessage: handleMessage,
    onOpen: () => {
      dispatch({ type: "SET_STATUS", status: "connecting" });
    },
    onClose: () => {
      dispatch({ type: "SET_STATUS", status: "idle" });
      audioEngine.stopMic();
      audioEngine.stopPlayback();
    },
    onError: () => {
      dispatch({
        type: "SET_ERROR",
        message: "Connection error. Please try again.",
      });
      audioEngine.stopMic();
      audioEngine.stopPlayback();
    },
  });

  // ── Sync refs every render ────────────────────────────────────────────────
  sendRawRef.current = wsHook.sendRaw;
  stopPlaybackRef.current = audioEngine.stopPlayback;
  playAudioChunkRef.current = audioEngine.playAudioChunk;

  // ── startInterview ────────────────────────────────────────────────────────
  const startInterview = useCallback(() => {
    const { jd, resume } = state.files;

    if (!jd || !resume) {
      dispatch({
        type: "SET_ERROR",
        message:
          "Please upload both a Job Description and a Resume before starting.",
      });
      return;
    }

    // Clear any previous evaluation when starting a fresh session
    dispatch({ type: "DISMISS_REPORT" });
    dispatch({ type: "RESET_MESSAGES" });
    dispatch({ type: "SET_STATUS", status: "connecting" });
    backendSessionIdRef.current = null;

    wsHook.connect(jd.b64, resume.b64, state.jobTitle);

    audioEngine.startMic().catch((err: Error) => {
      dispatch({
        type: "SET_ERROR",
        message: `Microphone access denied: ${err.message}`,
      });
    });
  }, [state.files, state.jobTitle, wsHook, audioEngine]);

  // ── endInterview ──────────────────────────────────────────────────────────
  // Flow:
  //  1. Capture backend session ID from ref BEFORE any reset
  //  2. Disconnect WS + stop audio (this triggers the server to finalise transcript)
  //  3. Reset UI state
  //  4. Wait briefly so the backend finishes writing the transcript to sessions_list
  //  5. Call GET /api/evaluate/{id} → store report → show modal
  const endInterview = useCallback(() => {
    // Step 1: capture ID now — RESET_MESSAGES will null it in state
    const sessionId = backendSessionIdRef.current;

    // Step 2: tear down connection
    wsHook.disconnect();
    audioEngine.stopMic();
    audioEngine.stopPlayback();

    // Step 3: reset UI
    dispatch({ type: "SET_STATUS", status: "idle" });
    dispatch({ type: "RESET_MESSAGES" });

    if (!sessionId) {
      console.warn(
        "[endInterview] No backend session ID — skipping evaluation",
      );
      return;
    }

    // Step 4 + 5: give the backend ~1.5 s to finalise the transcript, then evaluate
    dispatch({ type: "SET_EVALUATING", value: true });

    setTimeout(async () => {
      try {
        const res = await fetch(`${BASE_URL}/api/evaluate/${sessionId}`);

        if (!res.ok) {
          throw new Error(`Evaluate returned ${res.status}`);
        }

        const report: EvaluationReport = await res.json();
        dispatch({ type: "SET_EVALUATION", report });
      } catch (err) {
        console.error("[endInterview] Evaluation failed:", err);
        // Don't block the user — just stop the spinner silently
        dispatch({ type: "SET_EVALUATING", value: false });
      }
    }, 1500);
  }, [wsHook, audioEngine]);

  // ── dismissReport ─────────────────────────────────────────────────────────
  const dismissReport = useCallback(() => {
    dispatch({ type: "DISMISS_REPORT" });
  }, []);

  // ── toggleMute ────────────────────────────────────────────────────────────
  const toggleMute = useCallback(() => {
    dispatch({ type: "TOGGLE_MUTE" });
  }, []);

  // ── sendTextMessage ───────────────────────────────────────────────────────
  const sendTextMessage = useCallback(
    (text: string) => {
      const trimmed = text.trim();
      if (!trimmed) return;

      if (!wsHook.isConnected()) {
        dispatch({
          type: "SET_ERROR",
          message: "Not connected — start an interview session first.",
        });
        return;
      }

      dispatch({
        type: "ADD_MESSAGE",
        message: {
          id: `user-text-${Date.now()}`,
          role: "user",
          text: trimmed,
          timestamp: Date.now(),
          isPartial: false,
        },
      });

      wsHook.sendRaw({
        type: "conversation.item.create",
        item: {
          type: "message",
          role: "user",
          content: [{ type: "input_text", text: trimmed }],
        },
      } as unknown as WsOutgoingMessage);

      wsHook.sendRaw({
        type: "response.create",
      } as unknown as WsOutgoingMessage);
    },
    [wsHook],
  );

  // ── File setters ──────────────────────────────────────────────────────────
  const setJd = useCallback(
    (name: string, b64: string, sizeKb: number) =>
      dispatch({ type: "SET_JD", name, b64, sizeKb }),
    [],
  );

  const setResume = useCallback(
    (name: string, b64: string, sizeKb: number) =>
      dispatch({ type: "SET_RESUME", name, b64, sizeKb }),
    [],
  );

  const setJobTitle = useCallback(
    (title: string) => dispatch({ type: "SET_JOB_TITLE", title }),
    [],
  );

  // ── Context value ─────────────────────────────────────────────────────────
  const value: InterviewContextValue = {
    ...state.interview,
    files: state.files,
    evaluationReport: state.evaluationReport, // ← NEW
    isEvaluating: state.isEvaluating, // ← NEW
    setJd,
    setResume,
    setJobTitle,
    startInterview,
    endInterview,
    dismissReport, // ← NEW
    toggleMute,
    sendTextMessage,
  };

  return (
    <InterviewContext.Provider value={value}>
      {children}
    </InterviewContext.Provider>
  );
}

// ─── Consumer Hook ────────────────────────────────────────────────────────────

export function useInterview(): InterviewContextValue {
  const ctx = useContext(InterviewContext);
  if (!ctx) {
    throw new Error("useInterview must be used inside <InterviewProvider>");
  }
  return ctx;
}
