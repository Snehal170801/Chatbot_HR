// src/components/Dashboard/AddAndEvaluateButton.tsx

import { useState } from "react";
import { useInterview } from "../../context/InterviewContext";

// ─── End-call icon (phone hang-up, extracted from original SVG artwork) ────────
const EndCallIcon = ({ size = 30 }: { size?: number }) => (
  <svg
    width={size}
    height={size}
    viewBox="137 13 27 13"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    style={{ flexShrink: 0 }}
  >
    <path
      d="M143.58 24.0303L145.58 22.4403C146.06 22.0603 146.34 21.4803 146.34 20.8703V18.2703C149.36 17.2903 152.63 17.2803 155.66 18.2703V20.8803C155.66 21.4903 155.94 22.0703 156.42 22.4503L158.41 24.0303C159.21 24.6603 160.35 24.6003 161.07 23.8803L162.29 22.6603C163.09 21.8603 163.09 20.5303 162.24 19.7803C155.83 14.1203 146.17 14.1203 139.76 19.7803C138.91 20.5303 138.91 21.8603 139.71 22.6603L140.93 23.8803C141.64 24.6003 142.78 24.6603 143.58 24.0303Z"
      fill="currentColor"
    />
  </svg>
);

// ─── Confirmation Modal ───────────────────────────────────────────────────────
const ConfirmModal = ({
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
        transform: "translate(-50%, -50%)",
        zIndex: 1000,
        width: "min(380px, 90vw)",
        background:
          "linear-gradient(160deg, rgba(30,18,10,0.98) 0%, rgba(15,9,5,0.98) 100%)",
        border: "1px solid rgba(242,207,177,0.18)",
        borderRadius: 16,
        padding: "32px 28px 24px",
        boxShadow: "0 24px 64px rgba(0,0,0,0.7)",
        display: "flex",
        flexDirection: "column",
        gap: 20,
        boxSizing: "border-box",
      }}
    >
      <div style={{ display: "flex", justifyContent: "center" }}>
        <div
          style={{
            width: 52,
            height: 52,
            borderRadius: "50%",
            background: "rgba(255,107,107,0.12)",
            border: "1px solid rgba(255,107,107,0.25)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <svg
            viewBox="0 0 24 24"
            width="24"
            height="24"
            fill="none"
            stroke="#FF6B6B"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
        </div>
      </div>

      <div
        style={{
          textAlign: "center",
          display: "flex",
          flexDirection: "column",
          gap: 8,
        }}
      >
        <h2
          style={{
            fontFamily: "Poppins, sans-serif",
            fontWeight: 600,
            fontSize: 17,
            color: "#F1CFB1",
            margin: 0,
          }}
        >
          End Interview?
        </h2>
        <p
          style={{
            fontFamily: "Poppins, sans-serif",
            fontWeight: 400,
            fontSize: 13,
            color: "rgba(255,255,255,0.45)",
            margin: 0,
            lineHeight: 1.6,
          }}
        >
          This will close the session and save the transcript for evaluation.
          You cannot resume once ended.
        </p>
      </div>

      <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
        <button
          onClick={onCancel}
          style={{
            flex: 1,
            height: 40,
            borderRadius: 10,
            border: "1px solid rgba(255,255,255,0.12)",
            background: "rgba(255,255,255,0.06)",
            color: "rgba(255,255,255,0.6)",
            fontFamily: "Poppins, sans-serif",
            fontSize: 13,
            fontWeight: 500,
            cursor: "pointer",
            transition: "background 0.15s",
          }}
          onMouseEnter={(e) =>
            (e.currentTarget.style.background = "rgba(255,255,255,0.1)")
          }
          onMouseLeave={(e) =>
            (e.currentTarget.style.background = "rgba(255,255,255,0.06)")
          }
        >
          Cancel
        </button>
        <button
          onClick={onConfirm}
          style={{
            flex: 1,
            height: 40,
            borderRadius: 10,
            border: "1px solid rgba(255,107,107,0.35)",
            background: "rgba(255,107,107,0.15)",
            color: "#FF6B6B",
            fontFamily: "Poppins, sans-serif",
            fontSize: 13,
            fontWeight: 600,
            cursor: "pointer",
            transition: "background 0.15s",
          }}
          onMouseEnter={(e) =>
            (e.currentTarget.style.background = "rgba(255,107,107,0.25)")
          }
          onMouseLeave={(e) =>
            (e.currentTarget.style.background = "rgba(255,107,107,0.15)")
          }
        >
          End &amp; Save
        </button>
      </div>
    </div>
  </>
);

// ─── Button ───────────────────────────────────────────────────────────────────
const AddAndEvaluateButton = () => {
  const { status, endInterview } = useInterview();
  const [showModal, setShowModal] = useState(false);

  const isActive =
    status === "ready" ||
    status === "listening" ||
    status === "speaking" ||
    status === "connecting";

  const handleClick = () => {
    if (!isActive) return;
    setShowModal(true);
  };

  const handleConfirm = () => {
    setShowModal(false);
    endInterview();
  };

  const handleCancel = () => setShowModal(false);

  return (
    <>
      <button
        onClick={handleClick}
        className="flex w-full h-[53px] items-center justify-center gap-[13px] rounded-[32px] bg-black/20 shadow-[inset_0px_0px_50px_0px_rgba(242,207,177,1)] transition-colors duration-150"
        style={{
          cursor: isActive ? "pointer" : "not-allowed",
          opacity: isActive ? 1 : 0.35,
          transition: "opacity 0.2s, background-color 0.15s",
        }}
        onMouseEnter={(e) => {
          if (isActive)
            e.currentTarget.style.backgroundColor = "rgba(0,0,0,0.3)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = "";
        }}
        title={
          isActive
            ? "End interview and save session"
            : "Start an interview first"
        }
      >
        <span
          className="font-['Poppins'] font-semibold text-[14px] leading-none whitespace-nowrap"
          style={{ color: "rgba(255,255,255,0.85)" }}
        >
          End &amp; Evaluate
        </span>
        <EndCallIcon size={30} />
      </button>

      {showModal && (
        <ConfirmModal onConfirm={handleConfirm} onCancel={handleCancel} />
      )}
    </>
  );
};

export default AddAndEvaluateButton;
