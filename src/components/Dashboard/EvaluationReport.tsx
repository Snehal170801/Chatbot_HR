// src/components/Dashboard/EvaluationReport.tsx

import { useInterview } from "../../context/InterviewContext";
import type {
  EvaluationDecision,
  EvaluationCategory,
} from "../../types/interview";

// ─── Decision badge ───────────────────────────────────────────────────────────

const DECISION_CONFIG: Record<
  EvaluationDecision,
  { label: string; color: string; bg: string; border: string }
> = {
  Hire: {
    label: "Hire",
    color: "#7EE8A2",
    bg: "rgba(126,232,162,0.10)",
    border: "rgba(126,232,162,0.28)",
  },
  Hold: {
    label: "Hold",
    color: "#FFCEA5",
    bg: "rgba(255,206,165,0.10)",
    border: "rgba(255,206,165,0.28)",
  },
  "No Hire": {
    label: "No Hire",
    color: "#FF6B6B",
    bg: "rgba(255,107,107,0.10)",
    border: "rgba(255,107,107,0.28)",
  },
};

// ─── Score ring ───────────────────────────────────────────────────────────────

const ScoreRing = ({ score, color }: { score: number; color: string }) => {
  const R = 22;
  const C = 2 * Math.PI * R;
  const filled = (score / 10) * C;

  return (
    <svg width="60" height="60" viewBox="0 0 60 60" style={{ flexShrink: 0 }}>
      {/* track */}
      <circle
        cx="30"
        cy="30"
        r={R}
        fill="none"
        stroke="rgba(255,255,255,0.08)"
        strokeWidth="4"
      />
      {/* fill */}
      <circle
        cx="30"
        cy="30"
        r={R}
        fill="none"
        stroke={color}
        strokeWidth="4"
        strokeLinecap="round"
        strokeDasharray={`${filled} ${C - filled}`}
        strokeDashoffset={C / 4} /* start at 12 o'clock */
        style={{ transition: "stroke-dasharray 0.6s ease" }}
      />
      {/* label */}
      <text
        x="30"
        y="35"
        textAnchor="middle"
        fill={color}
        fontSize="13"
        fontFamily="Poppins, sans-serif"
        fontWeight="600"
      >
        {score}/10
      </text>
    </svg>
  );
};

// ─── Category row ─────────────────────────────────────────────────────────────

const CATEGORY_COLORS: Record<string, string> = {
  communication: "#FFCEA5",
  technical: "#A5C8FF",
  behavioural: "#C5A5FF",
};

const CategoryRow = ({
  label,
  category,
  colorKey,
}: {
  label: string;
  category: EvaluationCategory;
  colorKey: string;
}) => {
  const color = CATEGORY_COLORS[colorKey] ?? "#FFCEA5";

  return (
    <div
      style={{
        display: "flex",
        gap: 16,
        alignItems: "flex-start",
        padding: "16px 0",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      <ScoreRing score={category.score} color={color} />

      <div style={{ flex: 1, minWidth: 0 }}>
        <p
          style={{
            fontFamily: "Poppins, sans-serif",
            fontSize: 12,
            fontWeight: 600,
            color,
            margin: "0 0 6px",
            textTransform: "uppercase",
            letterSpacing: "0.06em",
          }}
        >
          {label}
        </p>
        <p
          style={{
            fontFamily: "Poppins, sans-serif",
            fontSize: 12,
            fontWeight: 400,
            color: "rgba(255,255,255,0.55)",
            lineHeight: 1.65,
            margin: 0,
          }}
        >
          {category.feedback}
        </p>
      </div>
    </div>
  );
};

// ─── Loading overlay (shown while evaluation is in progress) ──────────────────

const EvaluatingOverlay = () => (
  <>
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.65)",
        backdropFilter: "blur(6px)",
        zIndex: 1100,
      }}
    />
    <div
      style={{
        position: "fixed",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        zIndex: 1101,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 20,
      }}
    >
      {/* Spinner */}
      <svg width="52" height="52" viewBox="0 0 52 52">
        <circle
          cx="26"
          cy="26"
          r="20"
          fill="none"
          stroke="rgba(242,207,177,0.15)"
          strokeWidth="3"
        />
        <circle
          cx="26"
          cy="26"
          r="20"
          fill="none"
          stroke="#F2CFB1"
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray="30 96"
          style={{
            animation: "spin 0.9s linear infinite",
            transformOrigin: "center",
          }}
        />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </svg>

      <div style={{ textAlign: "center" }}>
        <p
          style={{
            fontFamily: "Poppins, sans-serif",
            fontSize: 15,
            fontWeight: 600,
            color: "#F2CFB1",
            margin: "0 0 6px",
          }}
        >
          Generating Evaluation
        </p>
        <p
          style={{
            fontFamily: "Poppins, sans-serif",
            fontSize: 12,
            color: "rgba(255,255,255,0.4)",
            margin: 0,
          }}
        >
          Analysing transcript against JD &amp; resume…
        </p>
      </div>
    </div>
  </>
);

// ─── Main Report Modal ────────────────────────────────────────────────────────

const EvaluationReport = () => {
  const { evaluationReport, isEvaluating, dismissReport } = useInterview();

  // Show spinner while waiting
  if (isEvaluating) return <EvaluatingOverlay />;

  // Nothing to show
  if (!evaluationReport) return null;

  const decision =
    DECISION_CONFIG[evaluationReport.decision] ?? DECISION_CONFIG["Hold"];

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={dismissReport}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.70)",
          backdropFilter: "blur(6px)",
          zIndex: 1100,
        }}
      />

      {/* Panel */}
      <div
        style={{
          position: "fixed",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          zIndex: 1101,
          width: "min(520px, 92vw)",
          maxHeight: "88dvh",
          display: "flex",
          flexDirection: "column",
          background:
            "linear-gradient(160deg, rgba(28,16,8,0.99) 0%, rgba(12,7,3,0.99) 100%)",
          border: "1px solid rgba(242,207,177,0.14)",
          borderRadius: 18,
          boxShadow: "0 32px 80px rgba(0,0,0,0.75)",
          overflow: "hidden",
        }}
      >
        {/* ── Header ── */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "20px 24px 16px",
            borderBottom: "1px solid rgba(255,255,255,0.07)",
            flexShrink: 0,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {/* Report icon */}
            <svg
              viewBox="0 0 24 24"
              width="18"
              height="18"
              fill="none"
              stroke="#F2CFB1"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ flexShrink: 0 }}
            >
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
              <polyline points="10 9 9 9 8 9" />
            </svg>
            <span
              style={{
                fontFamily: "Poppins, sans-serif",
                fontSize: 14,
                fontWeight: 600,
                color: "#F2CFB1",
              }}
            >
              Interview Evaluation
            </span>
          </div>

          {/* Decision badge */}
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span
              style={{
                fontFamily: "Poppins, sans-serif",
                fontSize: 11,
                fontWeight: 700,
                color: decision.color,
                background: decision.bg,
                border: `1px solid ${decision.border}`,
                borderRadius: 20,
                padding: "3px 12px",
                letterSpacing: "0.04em",
              }}
            >
              {decision.label}
            </span>

            {/* Close button */}
            <button
              onClick={dismissReport}
              style={{
                width: 28,
                height: 28,
                borderRadius: "50%",
                border: "1px solid rgba(255,255,255,0.12)",
                background: "rgba(255,255,255,0.06)",
                color: "rgba(255,255,255,0.5)",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                padding: 0,
                transition: "background 0.15s",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.background = "rgba(255,255,255,0.12)")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.background = "rgba(255,255,255,0.06)")
              }
              title="Close report"
            >
              <svg
                viewBox="0 0 24 24"
                width="13"
                height="13"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        </div>

        {/* ── Scrollable body ── */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "20px 24px 24px",
            scrollbarWidth: "thin",
            scrollbarColor: "rgba(255,255,255,0.12) transparent",
          }}
        >
          {/* Overall summary */}
          <div
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 12,
              padding: "14px 16px",
              marginBottom: 8,
            }}
          >
            <p
              style={{
                fontFamily: "Poppins, sans-serif",
                fontSize: 11,
                fontWeight: 600,
                color: "rgba(255,255,255,0.35)",
                textTransform: "uppercase",
                letterSpacing: "0.07em",
                margin: "0 0 8px",
              }}
            >
              Overall Summary
            </p>
            <p
              style={{
                fontFamily: "Poppins, sans-serif",
                fontSize: 12,
                fontWeight: 400,
                color: "rgba(255,255,255,0.70)",
                lineHeight: 1.7,
                margin: 0,
              }}
            >
              {evaluationReport.overall_summary}
            </p>
          </div>

          {/* Category rows */}
          <CategoryRow
            label="Communication"
            category={evaluationReport.communication}
            colorKey="communication"
          />
          <CategoryRow
            label="Technical"
            category={evaluationReport.technical}
            colorKey="technical"
          />
          <CategoryRow
            label="Behavioural"
            category={evaluationReport.behavioural}
            colorKey="behavioural"
          />
        </div>

        {/* ── Footer ── */}
        <div
          style={{
            flexShrink: 0,
            padding: "14px 24px",
            borderTop: "1px solid rgba(255,255,255,0.07)",
            display: "flex",
            justifyContent: "flex-end",
          }}
        >
          <button
            onClick={dismissReport}
            style={{
              height: 36,
              padding: "0 20px",
              borderRadius: 10,
              border: "1px solid rgba(242,207,177,0.25)",
              background: "rgba(242,207,177,0.08)",
              color: "#F2CFB1",
              fontFamily: "Poppins, sans-serif",
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
              transition: "background 0.15s",
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.background = "rgba(242,207,177,0.15)")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.background = "rgba(242,207,177,0.08)")
            }
          >
            Close Report
          </button>
        </div>
      </div>
    </>
  );
};

export default EvaluationReport;
