// src/components/Dashboard/ChatPanel.tsx

import { useState, useRef, useEffect } from "react";
import { Icon } from "@iconify/react";
import { useInterview } from "../../context/InterviewContext";
import type { ChatMessage } from "../../types/interview";

// ─── Sub-components ───────────────────────────────────────────────────────────

const AriaAvatar = () => (
  <svg
    viewBox="0 0 24 24"
    width="24"
    height="24"
    fill="white"
    style={{ flexShrink: 0 }}
  >
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z" />
  </svg>
);

const UserAvatar = () => (
  <svg
    viewBox="0 0 24 24"
    width="24"
    height="24"
    fill="#FFCEA5"
    style={{ flexShrink: 0 }}
  >
    <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z" />
  </svg>
);

// ─── Single message row ───────────────────────────────────────────────────────

const MessageRow = ({ msg }: { msg: ChatMessage }) => {
  const isAria = msg.role === "aria";

  if (isAria) {
    return (
      <div
        className="flex flex-row items-start"
        style={{ gap: 10, paddingRight: "10%" }}
      >
        <div style={{ flexShrink: 0, width: 24, height: 24, marginTop: 2 }}>
          <AriaAvatar />
        </div>

        <p
          className="m-0 p-0"
          style={{
            fontFamily: "Poppins",
            fontWeight: 400,
            fontSize: 12,
            lineHeight: "18px",
            color: msg.isPartial ? "rgba(205,205,205,0.6)" : "#CDCDCD",
            transition: "color 0.2s",
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
          }}
        >
          {msg.text}
          {msg.isPartial && (
            <span
              style={{
                display: "inline-block",
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: "#FFCEA5",
                marginLeft: 4,
                verticalAlign: "middle",
                animation: "pulse 1s infinite",
              }}
            />
          )}
        </p>
      </div>
    );
  }

  return (
    <div
      className="flex flex-row justify-end items-center"
      style={{ gap: 10, paddingLeft: "10%" }}
    >
      <p
        className="m-0 p-0 text-right"
        style={{
          fontFamily: "Poppins",
          fontWeight: 400,
          fontSize: 12,
          lineHeight: "18px",
          color: "#FFCEA5",
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
        }}
      >
        {msg.text}
      </p>
      <div style={{ flexShrink: 0, width: 24, height: 24 }}>
        <UserAvatar />
      </div>
    </div>
  );
};

// ─── Status bar config ────────────────────────────────────────────────────────

const STATUS_LABELS: Record<string, string> = {
  idle: "Upload files and press Start",
  connecting: "Connecting...",
  ready: "Aria is listening",
  listening: "Listening...",
  speaking: "Aria is speaking...",
  error: "Connection error",
};

const STATUS_COLORS: Record<string, string> = {
  idle: "rgba(255,255,255,0.3)",
  connecting: "#FFCEA5",
  ready: "rgba(255,255,255,0.5)",
  listening: "#7EE8A2",
  speaking: "#FFCEA5",
  error: "#FF6B6B",
};

// ─── Component ────────────────────────────────────────────────────────────────

const ChatPanel = () => {
  const {
    messages,
    status,
    isMuted,
    toggleMute,
    errorMessage,
    sendTextMessage, // ← now wired from context
  } = useInterview();

  const [inputValue, setInputValue] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ── handleSend: now actually sends ──────────────────────────────────────
  const handleSend = () => {
    const trimmed = inputValue.trim();
    if (!trimmed) return;
    sendTextMessage(trimmed); // ← fixed: was no-op before
    setInputValue("");
  };

  const canSend =
    inputValue.trim().length > 0 &&
    (status === "ready" || status === "listening" || status === "speaking");

  return (
    <div
      className="relative flex h-[520px] w-full flex-col rounded-[10px] border border-white/10 shadow-[0px_4px_4px_0px_rgba(0,0,0,0.25)] xl:absolute xl:left-[430px] xl:top-[65px] xl:h-[calc(var(--dash-h)-65px)] xl:max-h-none xl:min-h-0 xl:w-[calc(100%-879px)] xl:max-w-none"
      style={{ background: "rgba(4, 4, 4, 0.6)" }}
    >
      <style>{`
        .chat-panel-input::placeholder { color: rgba(255,255,255,0.4); }
        .chat-panel-input:focus { outline: none; }
        .chat-scroll::-webkit-scrollbar { width: 4px; }
        .chat-scroll::-webkit-scrollbar-track { background: transparent; }
        .chat-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.12); border-radius: 10px; }
        .chat-scroll::-webkit-scrollbar-thumb:hover { background: rgba(242,207,177,0.35); }
        @keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:0.3; } }
      `}</style>

      {/* ── Status bar ── */}
      <div
        className="flex min-w-0 shrink-0 items-center"
        style={{
          padding: "10px 16px 8px",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          gap: 8,
        }}
      >
        <span
          style={{
            display: "inline-block",
            width: 7,
            height: 7,
            borderRadius: "50%",
            background: STATUS_COLORS[status] ?? "rgba(255,255,255,0.3)",
            flexShrink: 0,
            transition: "background 0.3s",
            boxShadow:
              status === "listening" || status === "speaking"
                ? `0 0 6px 2px ${STATUS_COLORS[status]}55`
                : "none",
          }}
        />
        <span
          className="min-w-0 truncate"
          style={{
            fontFamily: "Poppins",
            fontSize: 11,
            color: STATUS_COLORS[status] ?? "rgba(255,255,255,0.3)",
            transition: "color 0.3s",
          }}
        >
          {errorMessage ?? STATUS_LABELS[status] ?? ""}
        </span>
      </div>

      {/* ── Messages scroll area ── */}
      <div
        className="chat-scroll flex-1 overflow-y-auto"
        style={{ padding: "16px 14px", minHeight: 0 }}
      >
        {messages.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center h-full"
            style={{ gap: 8, opacity: 0.3 }}
          >
            <svg viewBox="0 0 24 24" width="32" height="32" fill="white">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z" />
            </svg>
            <p
              style={{
                fontFamily: "Poppins",
                fontSize: 12,
                color: "rgba(255,255,255,0.6)",
                margin: 0,
                textAlign: "center",
              }}
            >
              {status === "idle"
                ? "Upload your Resume & JD, then press Start"
                : "Waiting for Aria..."}
            </p>
          </div>
        ) : (
          <div className="flex flex-col" style={{ gap: 16 }}>
            {messages.map((msg) => (
              <MessageRow key={msg.id} msg={msg} />
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* ── Input bar ── */}
      <div
        className="shrink-0 flex flex-row items-center"
        style={{
          margin: "0 3.59% 3.5% 3.59%",
          borderRadius: 10,
          background: "rgba(255,255,255,0.08)",
          border: "1px solid rgba(255,255,255,0.15)",
          padding: "0 12px",
          gap: 10,
          height: "6.24%",
          minHeight: 40,
          boxSizing: "border-box",
        }}
      >
        <input
          className="chat-panel-input min-w-0 flex-1 bg-transparent border-none"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          placeholder="Type your answer or click to speak......"
          style={{
            fontFamily: "Poppins",
            fontWeight: 400,
            fontSize: 12,
            lineHeight: "18px",
            color: "rgba(255,255,255,0.85)",
            whiteSpace: "nowrap",
            overflow: "hidden",
          }}
        />

        {/* Mic / Mute toggle */}
        <button
          onClick={toggleMute}
          className="flex-none flex items-center justify-center bg-transparent border-none cursor-pointer p-0"
          style={{
            width: 32,
            height: 32,
            borderRadius: "50%",
            background: isMuted
              ? "rgba(255,107,107,0.18)"
              : "rgba(255,255,255,0.08)",
            transition: "background 0.15s",
          }}
          title={isMuted ? "Unmute mic" : "Mute mic"}
        >
          <svg
            viewBox="0 0 24 24"
            width="16"
            height="16"
            fill="none"
            stroke={isMuted ? "#FF6B6B" : "rgba(255,255,255,0.7)"}
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            {isMuted ? (
              <>
                <line x1="1" y1="1" x2="23" y2="23" />
                <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6" />
                <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23" />
                <line x1="12" y1="19" x2="12" y2="22" />
                <line x1="8" y1="22" x2="16" y2="22" />
              </>
            ) : (
              <>
                <rect x="9" y="2" width="6" height="11" rx="3" />
                <path d="M5 10a7 7 0 0 0 14 0" />
                <line x1="12" y1="19" x2="12" y2="22" />
                <line x1="8" y1="22" x2="16" y2="22" />
              </>
            )}
          </svg>
        </button>

        {/* Send button */}
        <button
          onClick={handleSend}
          disabled={!canSend}
          className="flex-none flex items-center justify-center border-none bg-transparent cursor-pointer p-0"
          style={{
            width: 28,
            height: 28,
            cursor: canSend ? "pointer" : "default",
          }}
        >
          <Icon
            icon="mingcute:send-fill"
            style={{
              width: "100%",
              height: "100%",
              color: "#FFCEA5",
              transform: "rotate(13.55deg)",
              opacity: canSend ? 1 : 0.35,
              transition: "opacity 0.15s",
            }}
          />
        </button>
      </div>
    </div>
  );
};

export default ChatPanel;
