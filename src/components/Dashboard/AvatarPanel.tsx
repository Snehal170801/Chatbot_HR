// src/components/Dashboard/AvatarPanel.tsx

import { useEffect, useRef } from "react";
import { useInterview } from "../../context/InterviewContext";
import AvatarVideo from "../../assets/video.mp4";

const DOT_CONFIG: Record<string, { color: string; shadow: string }> = {
  idle: { color: "#555555", shadow: "none" },
  connecting: { color: "#FFCEA5", shadow: "0.88px 0px 5.52px #FFCEA5" },
  ready: { color: "#008E1C", shadow: "0.88px 0px 5.52px #008E1C" },
  listening: { color: "#7EE8A2", shadow: "0.88px 0px 5.52px #7EE8A2" },
  speaking: { color: "#FFCEA5", shadow: "0.88px 0px 5.52px #FFCEA5" },
  error: { color: "#FF6B6B", shadow: "0.88px 0px 5.52px #FF6B6B" },
};

const STATUS_LABEL: Record<string, string> = {
  idle: "Offline",
  connecting: "Connecting...",
  ready: "Ready",
  listening: "Listening",
  speaking: "Speaking",
  error: "Error",
};

const WAVE_HEIGHTS = [
  4, 7, 12, 17, 22, 17, 24, 29, 22, 17, 24, 19, 14, 22, 29, 22, 17, 12, 7, 4,
];

const AvatarPanel = () => {
  const { status } = useInterview();
  const videoRef = useRef<HTMLVideoElement>(null);
  const statusRef = useRef(status);
  statusRef.current = status;

  // On mount: unlock video + loop manually
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const tryPlay = () => {
      video.currentTime = 0;
      video.play().catch((e) => console.warn("play blocked:", e));
    };

    // Restart from beginning each time video ends, only if still speaking
    video.addEventListener("ended", () => {
      console.log("[video] ended, status is:", statusRef.current);
      if (statusRef.current === "speaking") {
        tryPlay();
      }
    });

    // Unlock autoplay on first load
    video.load();
  }, []);

  // Play/pause based on status
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    console.log("[AvatarPanel] status →", status);

    if (status === "speaking") {
      video.play().catch((e) => console.warn("play() failed:", e));
    } else {
      video.pause();
    }
  }, [status]);

  const dot = DOT_CONFIG[status] ?? DOT_CONFIG.idle;
  const label = STATUS_LABEL[status] ?? "Offline";
  const waveActive = status === "speaking" || status === "listening";

  const labelColor =
    status === "listening"
      ? "#7EE8A2"
      : status === "speaking"
        ? "#FFCEA5"
        : status === "error"
          ? "#FF6B6B"
          : "rgba(255,255,255,0.22)";

  return (
    <div
      className="relative w-full flex flex-col rounded-[12px] border border-white/10 bg-black/20 overflow-hidden xl:absolute xl:left-[calc(100%-423px)] xl:top-[65px] xl:h-[calc(var(--dash-h)-65px)] xl:w-[423px] xl:overflow-y-auto"
      style={{ boxSizing: "border-box" }}
    >
      {/* ── Avatar video ── */}
      <div
        className="relative w-full aspect-[4/3] xl:aspect-auto xl:absolute xl:left-[26px] xl:top-[24px] xl:h-[434px] xl:w-[372px]"
        style={{ background: "#000000" }}
      >
        <video
          ref={videoRef}
          src={AvatarVideo}
          muted
          playsInline
          preload="auto"
          className="w-full h-full object-cover object-top"
        />
        <div
          className="absolute flex items-center justify-center rounded-full"
          style={{ right: 16, top: 13, width: 21, height: 21 }}
        >
          <div
            className="rounded-full transition-all duration-500"
            style={{
              width: 14,
              height: 14,
              background: dot.color,
              boxShadow: dot.shadow,
            }}
          />
        </div>
      </div>

      {/* ── Mobile info block ── */}
      <div
        className="xl:hidden flex flex-col items-center"
        style={{ padding: "24px 20px 28px", gap: 10 }}
      >
        <p
          style={{
            fontFamily: "Josefin Sans",
            fontWeight: 400,
            fontSize: 28,
            lineHeight: "34px",
            color: "#FFFFFF",
            margin: 0,
            textAlign: "center",
          }}
        >
          Anushka Gajare
        </p>

        <p
          style={{
            fontFamily: "Poppins",
            fontWeight: 400,
            fontSize: 17,
            lineHeight: "25px",
            color: "#F2CFB1",
            margin: 0,
            textAlign: "center",
          }}
        >
          Senior HR Recruiter ( IT )
        </p>

        <p
          style={{
            fontFamily: "Poppins",
            fontWeight: 400,
            fontSize: 13,
            lineHeight: "20px",
            color: "#CDCDCD",
            margin: "6px 0 0",
            textAlign: "center",
          }}
        >
          Technical recruiter with 8+ years of experience in conducting
          candidate screenings and software engineering talent assessments.
        </p>
      </div>

      {/* ── Desktop-only elements (xl absolute positioned) ── */}

      {/* Name */}
      <p
        className="hidden xl:block xl:absolute xl:left-[86px] xl:top-[510px] xl:w-[257px] xl:whitespace-nowrap"
        style={{
          fontFamily: "Josefin Sans",
          fontWeight: 400,
          fontSize: 28,
          lineHeight: "34px",
          color: "#FFFFFF",
          margin: 0,
          textAlign: "center",
        }}
      >
        Anushka Gajare
      </p>

      {/* Role */}
      <p
        className="hidden xl:block xl:absolute xl:left-[108px] xl:top-[553px] xl:w-[212px] xl:whitespace-nowrap"
        style={{
          fontFamily: "Poppins",
          fontWeight: 400,
          fontSize: 17,
          lineHeight: "25px",
          color: "#F2CFB1",
          margin: 0,
          textAlign: "center",
        }}
      >
        Senior HR Recruiter ( IT )
      </p>

      {/* Divider */}
      <div className="hidden xl:block xl:absolute xl:left-[27px] xl:top-[598px] xl:w-[371px] border-t border-dashed border-white/10" />

      {/* Bio */}
      <p
        className="hidden xl:block xl:absolute xl:left-[34px] xl:top-[606px] xl:w-[371px]"
        style={{
          fontFamily: "Poppins",
          fontWeight: 400,
          fontSize: 14,
          lineHeight: "22px",
          color: "#CDCDCD",
          margin: 0,
          textAlign: "center",
        }}
      >
        Technical recruiter with 8+ years of experience in conducting candidate
        screenings and software engineering talent assessments.
      </p>

      {/* Waveform */}
      <div
        className="hidden xl:flex xl:absolute xl:left-[117px] xl:top-[695px] xl:w-[187px] items-center justify-center"
        style={{ height: 28, gap: 3 }}
      >
        <style>{`
          @keyframes waveform {
            from { transform: scaleY(0.4); opacity: 0.5; }
            to { transform: scaleY(1.3); opacity: 1; }
          }
          @keyframes waveform-idle {
            from { transform: scaleY(0.3); opacity: 0.2; }
            to { transform: scaleY(0.5); opacity: 0.3; }
          }
        `}</style>
        {WAVE_HEIGHTS.map((h, i) => (
          <div
            key={i}
            style={{
              width: 4,
              height: h,
              borderRadius: 999,
              background: waveActive
                ? "linear-gradient(180deg, #F1CFB1 0%, #886851 48.56%, #F1CFB1 100%)"
                : "rgba(255,255,255,0.15)",
              animation: waveActive
                ? `waveform ${0.8 + (i % 5) * 0.15}s ease-in-out infinite alternate`
                : `waveform-idle 2s ease-in-out infinite alternate`,
              animationDelay: `${i * 0.05}s`,
              transition: "background 0.4s",
            }}
          />
        ))}
      </div>

      {/* Status */}
      <p
        className="hidden xl:block xl:absolute xl:left-[182px] xl:top-[740px] xl:w-[56px] xl:whitespace-nowrap transition-all duration-300"
        style={{
          fontFamily: "Poppins",
          fontWeight: 400,
          fontSize: 12,
          lineHeight: "18px",
          color: labelColor,
          margin: 0,
          textAlign: "center",
        }}
      >
        {label}
      </p>
    </div>
  );
};

export default AvatarPanel;
