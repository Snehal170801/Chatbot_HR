// src/pages/Reports.tsx

import { useState, useCallback } from "react";
import { useSessions } from "../hooks/useSessions";
import type {
  EvaluationReport,
  EvaluationDecision,
  Session,
} from "../types/interview";

// ─── Config ───────────────────────────────────────────────────────────────────

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8008";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const DECISION_CONFIG: Record<
  EvaluationDecision,
  { color: string; bg: string; border: string }
> = {
  Hire: {
    color: "#7EE8A2",
    bg: "rgba(126,232,162,0.10)",
    border: "rgba(126,232,162,0.28)",
  },
  Hold: {
    color: "#FFCEA5",
    bg: "rgba(255,206,165,0.10)",
    border: "rgba(255,206,165,0.28)",
  },
  "No Hire": {
    color: "#FF6B6B",
    bg: "rgba(255,107,107,0.10)",
    border: "rgba(255,107,107,0.28)",
  },
};

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleString([], {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

// Parse "Anushka: text\nCandidate: text" → [{role, text}]
interface ParsedLine {
  role: "anushka" | "user";
  text: string;
}

function parseTranscript(raw: string): ParsedLine[] {
  if (!raw?.trim()) return [];
  const lines: ParsedLine[] = [];
  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (trimmed.startsWith("Anushka:")) {
      lines.push({
        role: "anushka",
        text: trimmed.slice("Anushka:".length).trim(),
      });
    } else if (trimmed.startsWith("Candidate:")) {
      lines.push({
        role: "user",
        text: trimmed.slice("Candidate:".length).trim(),
      });
    }
  }
  return lines;
}

// ─── Score ring ───────────────────────────────────────────────────────────────

const ScoreRing = ({ score, color }: { score: number; color: string }) => {
  const R = 18;
  const C = 2 * Math.PI * R;
  const filled = (score / 10) * C;
  return (
    <svg width="48" height="48" viewBox="0 0 48 48" style={{ flexShrink: 0 }}>
      <circle
        cx="24"
        cy="24"
        r={R}
        fill="none"
        stroke="rgba(255,255,255,0.08)"
        strokeWidth="3.5"
      />
      <circle
        cx="24"
        cy="24"
        r={R}
        fill="none"
        stroke={color}
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeDasharray={`${filled} ${C - filled}`}
        strokeDashoffset={C / 4}
      />
      <text
        x="24"
        y="28"
        textAnchor="middle"
        fill={color}
        fontSize="10"
        fontFamily="Poppins, sans-serif"
        fontWeight="600"
      >
        {score}/10
      </text>
    </svg>
  );
};

// ─── Transcript tab ───────────────────────────────────────────────────────────

const TranscriptView = ({ lines }: { lines: ParsedLine[] }) => {
  if (lines.length === 0) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          height: "100%",
          gap: 12,
          opacity: 0.35,
        }}
      >
        <svg
          viewBox="0 0 24 24"
          width="32"
          height="32"
          fill="none"
          stroke="rgba(255,255,255,0.6)"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
        <p
          style={{
            fontFamily: "Poppins",
            fontSize: 12,
            color: "rgba(255,255,255,0.5)",
            margin: 0,
          }}
        >
          No transcript available
        </p>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {lines.map((line, i) => {
        const isAria = line.role === "anushka";
        return (
          <div
            key={i}
            style={{
              display: "flex",
              flexDirection: isAria ? "row" : "row-reverse",
              alignItems: "flex-start",
              gap: 10,
              paddingLeft: isAria ? 0 : "15%",
              paddingRight: isAria ? "15%" : 0,
            }}
          >
            {/* Avatar */}
            <div
              style={{
                flexShrink: 0,
                width: 28,
                height: 28,
                borderRadius: 8,
                background: isAria
                  ? "linear-gradient(135deg,rgba(99,102,241,0.4),rgba(168,85,247,0.4))"
                  : "rgba(242,207,177,0.15)",
                border: `1px solid ${isAria ? "rgba(99,102,241,0.3)" : "rgba(242,207,177,0.2)"}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginTop: 2,
              }}
            >
              <span
                style={{
                  fontSize: 11,
                  color: isAria ? "rgba(168,85,247,0.9)" : "#FFCEA5",
                }}
              >
                {isAria ? "✦" : "U"}
              </span>
            </div>

            {/* Bubble */}
            <div
              style={{
                flex: 1,
                background: isAria
                  ? "rgba(255,255,255,0.04)"
                  : "rgba(242,207,177,0.08)",
                border: `1px solid ${isAria ? "rgba(255,255,255,0.08)" : "rgba(242,207,177,0.15)"}`,
                borderRadius: isAria
                  ? "4px 14px 14px 14px"
                  : "14px 4px 14px 14px",
                padding: "10px 14px",
              }}
            >
              <p
                style={{
                  fontFamily: "Poppins",
                  fontSize: 11,
                  fontWeight: 600,
                  color: isAria ? "rgba(168,85,247,0.8)" : "#FFCEA5",
                  margin: "0 0 5px",
                  // fontSize: 10,
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                }}
              >
                {isAria ? "Anushka" : "Candidate"}
              </p>
              <p
                style={{
                  fontFamily: "Poppins",
                  fontSize: 12,
                  color: isAria
                    ? "rgba(255,255,255,0.7)"
                    : "rgba(255,255,255,0.85)",
                  lineHeight: 1.65,
                  margin: 0,
                }}
              >
                {line.text}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
};

// ─── Evaluation tab ───────────────────────────────────────────────────────────

const EvaluationView = ({ report }: { report: EvaluationReport }) => {
  const decision = DECISION_CONFIG[report.decision] ?? DECISION_CONFIG["Hold"];
  const categories = [
    {
      key: "communication",
      label: "Communication",
      color: "#FFCEA5",
      data: report.communication,
    },
    {
      key: "technical",
      label: "Technical",
      color: "#A5C8FF",
      data: report.technical,
    },
    {
      key: "behavioural",
      label: "Behavioural",
      color: "#C5A5FF",
      data: report.behavioural,
    },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {/* Summary */}
      <div
        style={{
          background: "rgba(255,255,255,0.03)",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: 14,
          padding: "16px 18px",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 10,
          }}
        >
          <p
            style={{
              fontFamily: "Poppins",
              fontSize: 11,
              fontWeight: 600,
              color: "rgba(255,255,255,0.35)",
              textTransform: "uppercase",
              letterSpacing: "0.07em",
              margin: 0,
            }}
          >
            Overall Summary
          </p>
          <span
            style={{
              fontFamily: "Poppins",
              fontSize: 11,
              fontWeight: 700,
              color: decision.color,
              background: decision.bg,
              border: `1px solid ${decision.border}`,
              borderRadius: 20,
              padding: "3px 12px",
            }}
          >
            {report.decision}
          </span>
        </div>
        <p
          style={{
            fontFamily: "Poppins",
            fontSize: 12,
            color: "rgba(255,255,255,0.60)",
            lineHeight: 1.7,
            margin: 0,
          }}
        >
          {report.overall_summary}
        </p>
      </div>

      {/* Category cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3,1fr)",
          gap: 10,
        }}
      >
        {categories.map(({ key, label, color, data }) => (
          <div
            key={key}
            style={{
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 14,
              padding: "14px 12px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 8,
            }}
          >
            <ScoreRing score={data.score} color={color} />
            <p
              style={{
                fontFamily: "Poppins",
                fontSize: 10,
                fontWeight: 600,
                color,
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                margin: 0,
              }}
            >
              {label}
            </p>
            <div
              style={{
                width: "100%",
                height: 1,
                background: "rgba(255,255,255,0.06)",
              }}
            />
            <p
              style={{
                fontFamily: "Poppins",
                fontSize: 11,
                color: "rgba(255,255,255,0.48)",
                lineHeight: 1.65,
                margin: 0,
                textAlign: "left",
                width: "100%",
              }}
            >
              {data.feedback}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};

// ─── Right panel ──────────────────────────────────────────────────────────────

type Tab = "transcript" | "evaluation";

const RightPanel = ({
  session,
  transcript,
  report,
  loading,
  error,
}: {
  session: Session | null;
  transcript: ParsedLine[];
  report: EvaluationReport | null;
  loading: boolean;
  error: string | null;
}) => {
  const [tab, setTab] = useState<Tab>("transcript");

  if (!session && !loading) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          height: "100%",
          gap: 12,
          opacity: 0.3,
        }}
      >
        <svg
          viewBox="0 0 24 24"
          width="38"
          height="38"
          fill="none"
          stroke="rgba(255,255,255,0.6)"
          strokeWidth="1.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="16" y1="13" x2="8" y2="13" />
          <line x1="16" y1="17" x2="8" y2="17" />
        </svg>
        <p
          style={{
            fontFamily: "Poppins",
            fontSize: 13,
            color: "rgba(255,255,255,0.5)",
            margin: 0,
            textAlign: "center",
          }}
        >
          Select a session to view transcript &amp; evaluation
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          height: "100%",
          gap: 14,
        }}
      >
        <svg width="40" height="40" viewBox="0 0 40 40">
          <circle
            cx="20"
            cy="20"
            r="15"
            fill="none"
            stroke="rgba(242,207,177,0.15)"
            strokeWidth="3"
          />
          <circle
            cx="20"
            cy="20"
            r="15"
            fill="none"
            stroke="#F2CFB1"
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray="22 72"
            style={{
              animation: "spin 0.9s linear infinite",
              transformOrigin: "center",
            }}
          />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </svg>
        <p
          style={{
            fontFamily: "Poppins",
            fontSize: 12,
            color: "rgba(255,255,255,0.35)",
            margin: 0,
          }}
        >
          Loading session…
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "100%",
        }}
      >
        <p
          style={{
            fontFamily: "Poppins",
            fontSize: 13,
            color: "#FF6B6B",
            margin: 0,
          }}
        >
          {error}
        </p>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* Session meta */}
      <div style={{ flexShrink: 0, marginBottom: 14 }}>
        <p
          style={{
            fontFamily: "Poppins",
            fontSize: 14,
            fontWeight: 600,
            color: "#F2CFB1",
            margin: "0 0 2px",
          }}
        >
          {session?.candidate_name ?? "—"}
        </p>
        <p
          style={{
            fontFamily: "Poppins",
            fontSize: 11,
            color: "rgba(255,255,255,0.35)",
            margin: 0,
          }}
        >
          {session?.job_title ?? "—"} · {formatDate(session?.timestamp ?? "")}
        </p>
      </div>

      {/* Tabs */}
      <div
        style={{
          display: "flex",
          flexShrink: 0,
          background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: 10,
          padding: 4,
          gap: 4,
          marginBottom: 16,
          width: "fit-content",
        }}
      >
        {(["transcript", "evaluation"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              fontFamily: "Poppins",
              fontSize: 12,
              fontWeight: 500,
              padding: "6px 18px",
              borderRadius: 8,
              border: "none",
              cursor: "pointer",
              background: tab === t ? "rgba(242,207,177,0.14)" : "transparent",
              color: tab === t ? "#F2CFB1" : "rgba(255,255,255,0.35)",
              transition: "all 0.15s",
              textTransform: "capitalize",
            }}
          >
            {t === "transcript" ? "💬 Transcript" : "📊 Evaluation"}
          </button>
        ))}
      </div>

      {/* Tab content — scrollable */}
      <div
        style={{ flex: 1, overflowY: "auto", minHeight: 0, paddingRight: 4 }}
      >
        {tab === "transcript" && <TranscriptView lines={transcript} />}
        {tab === "evaluation" &&
          (report ? (
            <EvaluationView report={report} />
          ) : (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                height: "100%",
              }}
            >
              <p
                style={{
                  fontFamily: "Poppins",
                  fontSize: 12,
                  color: "rgba(255,255,255,0.3)",
                  margin: 0,
                }}
              >
                No evaluation report found for this session.
              </p>
            </div>
          ))}
      </div>
    </div>
  );
};

// ─── Delete confirm modal ─────────────────────────────────────────────────────

const DeleteModal = ({
  onConfirm,
  onCancel,
}: {
  onConfirm: () => void;
  onCancel: () => void;
}) => (
  <>
    <div
      onClick={onCancel}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.6)",
        backdropFilter: "blur(4px)",
        zIndex: 999,
      }}
    />
    <div
      style={{
        position: "fixed",
        top: "50%",
        left: "50%",
        transform: "translate(-50%,-50%)",
        zIndex: 1000,
        width: "min(360px,90vw)",
        background:
          "linear-gradient(160deg,rgba(30,18,10,0.98) 0%,rgba(15,9,5,0.98) 100%)",
        border: "1px solid rgba(242,207,177,0.18)",
        borderRadius: 16,
        padding: "28px 24px 22px",
        display: "flex",
        flexDirection: "column",
        gap: 18,
      }}
    >
      <p
        style={{
          fontFamily: "Poppins",
          fontSize: 15,
          fontWeight: 600,
          color: "#F1CFB1",
          margin: 0,
          textAlign: "center",
        }}
      >
        Delete Session?
      </p>
      <p
        style={{
          fontFamily: "Poppins",
          fontSize: 12,
          color: "rgba(255,255,255,0.4)",
          margin: 0,
          textAlign: "center",
          lineHeight: 1.6,
        }}
      >
        This will permanently remove the session and its transcript from the
        server.
      </p>
      <div style={{ display: "flex", gap: 10 }}>
        <button
          onClick={onCancel}
          style={{
            flex: 1,
            height: 38,
            borderRadius: 10,
            border: "1px solid rgba(255,255,255,0.12)",
            background: "rgba(255,255,255,0.06)",
            color: "rgba(255,255,255,0.6)",
            fontFamily: "Poppins",
            fontSize: 13,
            fontWeight: 500,
            cursor: "pointer",
          }}
        >
          Cancel
        </button>
        <button
          onClick={onConfirm}
          style={{
            flex: 1,
            height: 38,
            borderRadius: 10,
            border: "1px solid rgba(255,107,107,0.35)",
            background: "rgba(255,107,107,0.15)",
            color: "#FF6B6B",
            fontFamily: "Poppins",
            fontSize: 13,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Delete
        </button>
      </div>
    </div>
  </>
);

// ─── Main page ────────────────────────────────────────────────────────────────

const Reports = () => {
  const {
    sessions,
    loading: sessionsLoading,
    error: sessionsError,
    refresh,
  } = useSessions();

  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [transcript, setTranscript] = useState<ParsedLine[]>([]);
  const [report, setReport] = useState<EvaluationReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  // ── Select session → fetch transcript + evaluation in parallel ────────────
  const handleSelect = useCallback(
    async (sess: Session) => {
      if (sess.id === selectedSession?.id) return;
      setSelectedSession(sess);
      setTranscript([]);
      setReport(null);
      setError(null);
      setLoading(true);

      try {
        const [sessRes, evalRes] = await Promise.all([
          fetch(`${BASE_URL}/api/sessions/${sess.id}`),
          fetch(`${BASE_URL}/api/evaluate/${sess.id}`),
        ]);

        if (sessRes.ok) {
          const sessData: Session = await sessRes.json();
          setTranscript(parseTranscript(sessData.transcript ?? ""));
        }

        if (evalRes.ok) {
          const evalData: EvaluationReport = await evalRes.json();
          setReport(evalData);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load session");
      } finally {
        setLoading(false);
      }
    },
    [selectedSession],
  );

  // ── Delete ────────────────────────────────────────────────────────────────
  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await fetch(`${BASE_URL}/api/sessions/${deleteTarget}`, {
        method: "DELETE",
      });
      if (selectedSession?.id === deleteTarget) {
        setSelectedSession(null);
        setTranscript([]);
        setReport(null);
      }
      refresh();
    } catch (err) {
      console.error("[Reports] delete failed", err);
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  }, [deleteTarget, selectedSession, refresh]);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        gap: 0,
      }}
    >
      {/* Page header */}
      <div style={{ marginBottom: 20, flexShrink: 0 }}>
        <h1
          style={{
            fontFamily: "Poppins",
            fontSize: 20,
            fontWeight: 600,
            color: "#F2CFB1",
            margin: "0 0 4px",
          }}
        >
          Interview Reports
        </h1>
        <p
          style={{
            fontFamily: "Poppins",
            fontSize: 12,
            color: "rgba(255,255,255,0.35)",
            margin: 0,
          }}
        >
          {sessions.length} session{sessions.length !== 1 ? "s" : ""} recorded
        </p>
      </div>

      {/* Two-column layout */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "280px 1fr",
          gap: 16,
          flex: 1,
          minHeight: 0,
        }}
      >
        {/* Left — session list */}
        <div
          style={{
            background: "rgba(4,4,4,0.5)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 14,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}
        >
          {/* List header */}
          <div
            style={{
              padding: "14px 16px 10px",
              borderBottom: "1px solid rgba(255,255,255,0.06)",
              flexShrink: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <span
              style={{
                fontFamily: "Poppins",
                fontSize: 11,
                fontWeight: 600,
                color: "rgba(255,255,255,0.35)",
                textTransform: "uppercase",
                letterSpacing: "0.07em",
              }}
            >
              Sessions
            </span>
            <button
              onClick={refresh}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                color: "rgba(255,255,255,0.3)",
                padding: 4,
                display: "flex",
                alignItems: "center",
              }}
              title="Refresh"
            >
              <svg
                viewBox="0 0 24 24"
                width="13"
                height="13"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="23 4 23 10 17 10" />
                <polyline points="1 20 1 14 7 14" />
                <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
              </svg>
            </button>
          </div>

          {/* List body */}
          <div style={{ flex: 1, overflowY: "auto", padding: "8px" }}>
            {sessionsLoading && (
              <p
                style={{
                  fontFamily: "Poppins",
                  fontSize: 12,
                  color: "rgba(255,255,255,0.3)",
                  textAlign: "center",
                  marginTop: 32,
                }}
              >
                Loading…
              </p>
            )}
            {sessionsError && (
              <p
                style={{
                  fontFamily: "Poppins",
                  fontSize: 12,
                  color: "#FF6B6B",
                  textAlign: "center",
                  marginTop: 32,
                  padding: "0 12px",
                }}
              >
                {sessionsError}
              </p>
            )}
            {!sessionsLoading && !sessionsError && sessions.length === 0 && (
              <p
                style={{
                  fontFamily: "Poppins",
                  fontSize: 12,
                  color: "rgba(255,255,255,0.25)",
                  textAlign: "center",
                  marginTop: 32,
                }}
              >
                No sessions yet
              </p>
            )}
            {sessions.map((sess) => {
              const active = sess.id === selectedSession?.id;
              return (
                <div
                  key={sess.id}
                  onClick={() => handleSelect(sess)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "10px 10px",
                    borderRadius: 10,
                    cursor: "pointer",
                    background: active
                      ? "rgba(242,207,177,0.10)"
                      : "transparent",
                    border: `1px solid ${active ? "rgba(242,207,177,0.20)" : "transparent"}`,
                    marginBottom: 4,
                    transition: "background 0.15s",
                  }}
                  onMouseEnter={(e) => {
                    if (!active)
                      e.currentTarget.style.background =
                        "rgba(255,255,255,0.04)";
                  }}
                  onMouseLeave={(e) => {
                    if (!active)
                      e.currentTarget.style.background = "transparent";
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p
                      style={{
                        fontFamily: "Poppins",
                        fontSize: 12,
                        fontWeight: 600,
                        color: active ? "#F2CFB1" : "rgba(255,255,255,0.75)",
                        margin: "0 0 2px",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {sess.candidate_name || "Unknown Candidate"}
                    </p>
                    <p
                      style={{
                        fontFamily: "Poppins",
                        fontSize: 10,
                        color: "rgba(255,255,255,0.35)",
                        margin: "0 0 2px",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {sess.job_title || "—"}
                    </p>
                    <p
                      style={{
                        fontFamily: "Poppins",
                        fontSize: 10,
                        color: "rgba(255,255,255,0.25)",
                        margin: 0,
                      }}
                    >
                      {formatDate(sess.timestamp)}
                    </p>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleteTarget(sess.id);
                    }}
                    style={{
                      flexShrink: 0,
                      width: 26,
                      height: 26,
                      borderRadius: 7,
                      border: "1px solid rgba(255,107,107,0.20)",
                      background: "rgba(255,107,107,0.08)",
                      color: "#FF6B6B",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      transition: "background 0.15s",
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.background =
                        "rgba(255,107,107,0.20)")
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.background =
                        "rgba(255,107,107,0.08)")
                    }
                    title="Delete session"
                  >
                    <svg
                      viewBox="0 0 24 24"
                      width="12"
                      height="12"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    </svg>
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right — transcript + evaluation */}
        <div
          style={{
            background: "rgba(4,4,4,0.5)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 14,
            padding: "20px",
            overflowY: "hidden",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <RightPanel
            session={selectedSession}
            transcript={transcript}
            report={report}
            loading={loading}
            error={error}
          />
        </div>
      </div>

      {/* Delete confirm */}
      {deleteTarget && !deleting && (
        <DeleteModal
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
};

export default Reports;
