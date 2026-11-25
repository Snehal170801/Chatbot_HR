// src/components/Dashboard/Panel.tsx

import { useState, useRef, useEffect, useCallback } from "react";
import { Icon } from "@iconify/react";
import {
  Ghost,
  ChevronDown,
  Check,
  RefreshCw,
  AlertCircle,
  History,
} from "lucide-react";
import { useInterview } from "../../context/InterviewContext";
import { useSessions } from "../../hooks/useSessions";
import AddAndEvaluateButton from "./AddAndEvaluateButton";

const JOB_OPTIONS = [
  "Software Engineer",
  "Frontend Developer",
  "Backend Developer",
  "Full Stack Developer",
  "DevOps Engineer",
  "Data Scientist",
  "Product Manager",
  "UI/UX Designer",
];

function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(",")[1]);
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function getInitial(name: string | undefined | null): string {
  return name?.trim()?.charAt(0)?.toUpperCase() || "?";
}

interface PanelProps {
  onSessionClick?: (sessionId: string, index: number) => void;
}

const Panel = ({ onSessionClick }: PanelProps) => {
  const {
    files,
    setJd,
    setResume,
    setJobTitle,
    startInterview,
    endInterview,
    status,
  } = useInterview();

  const {
    sessions,
    loading: sessionsLoading,
    error: sessionsError,
    refresh,
  } = useSessions();

  const prevStatus = useRef(status);
  useEffect(() => {
    const prev = prevStatus.current;
    const curr = status;
    if (prev === "connecting" && curr === "ready") refresh();
    if (prev !== "idle" && prev !== "error" && curr === "idle") {
      const t = setTimeout(refresh, 1500);
      prevStatus.current = curr;
      return () => clearTimeout(t);
    }
    prevStatus.current = curr;
  }, [status, refresh]);

  const [jobOpen, setJobOpen] = useState(false);
  const [selectedJob, setSelectedJob] = useState<string | null>(null);
  // Default closed, opens downward below its own trigger
  const [sessionsOpen, setSessionsOpen] = useState(false);
  const [activeSession, setActiveSession] = useState<string | null>(null);

  const jobRef = useRef<HTMLDivElement>(null);
  const sessionsRef = useRef<HTMLDivElement>(null);
  const resumeInputRef = useRef<HTMLInputElement>(null);
  const jdInputRef = useRef<HTMLInputElement>(null);

  const isActive = status !== "idle" && status !== "error";

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (jobRef.current && !jobRef.current.contains(e.target as Node))
        setJobOpen(false);
      if (
        sessionsRef.current &&
        !sessionsRef.current.contains(e.target as Node)
      )
        setSessionsOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleResumeUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      try {
        const b64 = await readFileAsBase64(file);
        setResume(file.name, b64, Math.round(file.size / 1024));
      } catch (err) {
        console.error("[Panel] failed to read resume", err);
      }
      e.target.value = "";
    },
    [setResume],
  );

  const handleJdUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      try {
        const b64 = await readFileAsBase64(file);
        setJd(file.name, b64, Math.round(file.size / 1024));
      } catch (err) {
        console.error("[Panel] failed to read JD", err);
      }
      e.target.value = "";
    },
    [setJd],
  );

  const handleRefresh = useCallback(
    (e?: React.MouseEvent) => {
      e?.stopPropagation();
      refresh();
    },
    [refresh],
  );

  const handleStartEnd = useCallback(() => {
    if (isActive) endInterview();
    else startInterview();
  }, [isActive, startInterview, endInterview]);

  const handleSessionClick = useCallback(
    (sessionId: string, index: number) => {
      setActiveSession(sessionId);
      setSessionsOpen(false);
      onSessionClick?.(sessionId, index);
    },
    [onSessionClick],
  );

  const resumeLabel = files.resume?.name ?? "Upload Resume";
  const jdLabel = files.jd?.name ?? "Upload Job Description ( JD )";
  const btnLabel = isActive ? "End Interview" : "Start HR Interview";
  const btnIcon = isActive ? "bi:stop-fill" : "bi:skip-start-fill";

  return (
    <div className="relative flex w-full h-full flex-col gap-4 rounded-[12px] border border-white/10 bg-[rgba(171,139,116,0.1)] p-4 xl:absolute xl:left-0 xl:top-0 xl:block xl:h-[var(--dash-h)] xl:w-[417px] xl:gap-0 xl:p-0 xl:overflow-visible">
      {/* ── Interview Agent header ── */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-3 xl:absolute xl:left-[25px] xl:top-[24px] xl:h-[58px] xl:w-[321px] xl:gap-[13px] xl:p-3">
          <Ghost
            style={{ width: 30, height: 30, color: "#FFFFFF", flexShrink: 0 }}
          />
          <h1
            className="m-0 font-['Josefin_Sans'] font-normal leading-none text-[clamp(22px,6vw,34px)] xl:text-[34px]"
            style={{ color: "#FFFFFF" }}
          >
            Interview Agent
          </h1>
        </div>
        <p
          className="m-0 font-['Josefin_Sans'] font-normal leading-none text-[15px] xl:absolute xl:left-[81px] xl:top-[88px] xl:text-[19px]"
          style={{ color: "#FFCEA5" }}
        >
          Position Target
        </p>
      </div>

      {/* Line 1 */}
      <div className="border-t border-dashed border-white/10 xl:absolute xl:left-[25px] xl:top-[132px] xl:w-[366px]" />

      {/* ── Role Dropdown ── */}
      <div
        ref={jobRef}
        className="relative z-20 w-full xl:absolute xl:left-[25px] xl:top-[156px] xl:w-[366px]"
      >
        <button
          type="button"
          onClick={() => setJobOpen((o) => !o)}
          className="w-full h-12 rounded-[12px] bg-white/10 hover:bg-white/[0.14] transition-colors duration-150 flex items-center justify-between px-3 cursor-pointer group"
        >
          <div className="flex items-center gap-[10px] min-w-0">
            <Icon
              icon="solar:briefcase-minimalistic-bold-duotone"
              className="w-5 h-5 shrink-0"
              style={{ color: "#F2CFB1", opacity: selectedJob ? 0.85 : 0.45 }}
            />
            <span
              className="font-['Poppins'] text-[16px] leading-none truncate"
              style={{
                color: selectedJob
                  ? "rgba(255,255,255,0.85)"
                  : "rgba(255,255,255,0.38)",
              }}
            >
              {selectedJob ?? "Select Role"}
            </span>
          </div>
          <ChevronDown
            className={`w-5 h-5 shrink-0 ml-[10px] transition-transform duration-200 ${
              jobOpen
                ? "rotate-180 text-white/70"
                : "text-white/35 group-hover:text-white/55"
            }`}
            strokeWidth={2}
          />
        </button>

        {jobOpen && (
          <div
            className="absolute top-[calc(100%+10px)] left-0 w-full rounded-[15px] border border-white/8 overflow-hidden z-30"
            style={{
              background: "rgba(18, 11, 6, 0.97)",
              backdropFilter: "blur(20px)",
              boxShadow:
                "0 4px 6px -1px rgba(0,0,0,0.3), 0 16px 40px -4px rgba(0,0,0,0.55)",
            }}
          >
            <div
              style={{
                paddingLeft: 18,
                paddingRight: 18,
                paddingTop: 14,
                paddingBottom: 10,
              }}
            >
              <span
                className="font-['Poppins'] font-medium tracking-[0.08em] uppercase leading-none"
                style={{ fontSize: 12, color: "rgba(242,207,177,0.45)" }}
              >
                Available Roles
              </span>
            </div>
            <div
              style={{ marginLeft: 15, marginRight: 15, marginBottom: 5 }}
              className="border-t border-white/6"
            />
            <div
              style={{
                paddingTop: 5,
                paddingBottom: 5,
                paddingLeft: 8,
                paddingRight: 8,
              }}
            >
              {JOB_OPTIONS.map((job, idx) => {
                const isSelected = selectedJob === job;
                return (
                  <div
                    key={job}
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => {
                      setSelectedJob(job);
                      setJobTitle(job);
                      setJobOpen(false);
                    }}
                    className={`flex items-center justify-between rounded-lg cursor-pointer transition-all duration-100 ${
                      isSelected ? "bg-white/8" : "hover:bg-white/5"
                    }`}
                    style={{
                      paddingLeft: 15,
                      paddingRight: 15,
                      height: 43,
                      marginTop: idx !== 0 ? 2 : 0,
                    }}
                  >
                    <div
                      className="flex items-center min-w-0"
                      style={{ gap: 13 }}
                    >
                      <span
                        className="rounded-full shrink-0"
                        style={{
                          width: 5,
                          height: 5,
                          background: isSelected
                            ? "#F2CFB1"
                            : "rgba(255,255,255,0.2)",
                          opacity: isSelected ? 1 : 0.5,
                        }}
                      />
                      <span
                        className="font-['Poppins'] leading-none truncate"
                        style={{
                          fontSize: 15,
                          color: isSelected
                            ? "#F2CFB1"
                            : "rgba(255,255,255,0.62)",
                          fontWeight: isSelected ? 500 : 400,
                        }}
                      >
                        {job}
                      </span>
                    </div>
                    {isSelected && (
                      <Check
                        style={{
                          width: 17,
                          height: 17,
                          marginLeft: 10,
                          color: "#F2CFB1",
                        }}
                        strokeWidth={2.5}
                      />
                    )}
                  </div>
                );
              })}
            </div>
            <div style={{ height: 7 }} />
          </div>
        )}
      </div>

      {/* Line 2 */}
      <div className="border-t border-dashed border-white/10 xl:absolute xl:left-[25px] xl:top-[228px] xl:w-[366px]" />

      {/* ── Upload section ── */}
      <div className="relative w-full rounded-[12px] bg-white/10 p-5 xl:absolute xl:left-[38px] xl:top-[252px] xl:h-[197px] xl:w-[353px] xl:p-0">
        <div className="flex w-full flex-col items-start gap-4 xl:absolute xl:left-[25px] xl:top-[36px] xl:h-[124px] xl:w-[301px] xl:gap-[18px]">
          <input
            ref={resumeInputRef}
            type="file"
            accept="application/pdf"
            className="hidden"
            onChange={handleResumeUpload}
          />
          <input
            ref={jdInputRef}
            type="file"
            accept="application/pdf"
            className="hidden"
            onChange={handleJdUpload}
          />

          <button
            onClick={() => resumeInputRef.current?.click()}
            className="w-full h-[53px] rounded-[32px] bg-black/20 flex items-center justify-center hover:bg-black/30 transition-colors duration-150 shadow-[inset_0px_0px_50px_0px_rgba(255,255,255,0.64)] cursor-pointer gap-[13px]"
          >
            <span
              className="font-['Poppins'] text-[13px] sm:text-[14px] leading-none truncate min-w-0 px-3"
              style={{
                color: files.resume ? "#F2CFB1" : "rgba(255,255,255,0.8)",
              }}
            >
              {resumeLabel}
            </span>
            <Icon
              icon={files.resume ? "line-md:confirm" : "line-md:upload"}
              style={{ width: 30, height: 30, flexShrink: 0 }}
              className={files.resume ? "text-[#F2CFB1]" : "text-white/80"}
            />
          </button>

          <button
            onClick={() => jdInputRef.current?.click()}
            className="w-full h-[53px] rounded-[32px] bg-black/20 flex items-center justify-center hover:bg-black/30 transition-colors duration-150 shadow-[inset_0px_0px_50px_0px_rgba(255,255,255,0.64)] cursor-pointer gap-[13px]"
          >
            <span
              className="font-['Poppins'] text-[13px] sm:text-[14px] leading-none truncate min-w-0 px-3"
              style={{ color: files.jd ? "#F2CFB1" : "rgba(255,255,255,0.8)" }}
            >
              {jdLabel}
            </span>
            <Icon
              icon={files.jd ? "line-md:confirm" : "line-md:upload"}
              style={{ width: 30, height: 30, flexShrink: 0 }}
              className={files.jd ? "text-[#F2CFB1]" : "text-white/80"}
            />
          </button>
        </div>
      </div>

      {/* Line 3 */}
      <div className="border-t border-dashed border-white/10 xl:absolute xl:left-[25px] xl:top-[473px] xl:w-[366px]" />

      {/* ── Start / End button ── */}
      <button
        onClick={handleStartEnd}
        className="flex w-full h-[53px] cursor-pointer items-center justify-center gap-[13px] rounded-[32px] bg-black/20 shadow-[inset_0px_0px_50px_0px_rgba(242,207,177,1)] transition-colors duration-150 hover:bg-black/30 xl:absolute xl:left-[38px] xl:top-[497px] xl:w-[353px]"
      >
        <span className="font-['Poppins'] font-semibold text-[14px] leading-none text-white/85 whitespace-nowrap">
          {btnLabel}
        </span>
        <Icon
          icon={btnIcon}
          style={{ width: 30, height: 30 }}
          className="text-white/85"
        />
      </button>

      {/* ── End & Evaluate — identical size & style to the Start/End button ── */}
      <div className="w-full xl:absolute xl:left-[38px] xl:top-[562px] xl:w-[353px]">
        <AddAndEvaluateButton />
      </div>

      {/* Line 4 — separates actions from sessions */}
      <div className="border-t border-dashed border-white/10 xl:absolute xl:left-[25px] xl:top-[639px] xl:w-[366px]" />

      {/* ── Sessions ── now sits right under the divider, opens downward like the Role dropdown ── */}
      <div
        ref={sessionsRef}
        className="relative z-10 w-full xl:absolute xl:left-[38px] xl:top-[663px] xl:w-[353px]"
      >
        <button
          type="button"
          aria-haspopup="listbox"
          aria-expanded={sessionsOpen}
          onClick={() => setSessionsOpen((o) => !o)}
          className="group flex w-full h-12 cursor-pointer items-center justify-between rounded-[12px] bg-white/10 px-3 transition-colors duration-150 hover:bg-white/[0.14]"
        >
          <div className="flex items-center gap-[10px] min-w-0">
            {/* <Icon
              icon="solar:history-bold-duotone"
              className="w-5 h-5 shrink-0"
              style={{
                color: "#F2CFB1",
                opacity: sessions.length ? 0.85 : 0.45,
              }}
            /> */}
            <span
              className="font-['Poppins'] text-[16px] leading-none truncate"
              style={{
                color: sessions.length
                  ? "rgba(255,255,255,0.85)"
                  : "rgba(255,255,255,0.38)",
              }}
            >
              {activeSession
                ? (sessions.find((s) => s.id === activeSession)
                    ?.candidate_name ?? "Sessions")
                : "Sessions"}
            </span>
          </div>
          <ChevronDown
            className={`w-5 h-5 shrink-0 ml-[10px] transition-transform duration-200 ${
              sessionsOpen
                ? "rotate-180 text-white/70"
                : "text-white/35 group-hover:text-white/55"
            }`}
            strokeWidth={2}
          />
        </button>

        {sessionsOpen && (
          <div
            className="absolute top-[calc(100%+10px)] left-0 w-full rounded-[15px] border border-white/8 overflow-hidden z-30"
            style={{
              background: "rgba(18, 11, 6, 0.97)",
              backdropFilter: "blur(20px)",
              boxShadow:
                "0 4px 6px -1px rgba(0,0,0,0.3), 0 16px 40px -4px rgba(0,0,0,0.55)",
            }}
          >
            <div
              className="flex items-center justify-between"
              style={{
                paddingLeft: 18,
                paddingRight: 12,
                paddingTop: 14,
                paddingBottom: 10,
              }}
            >
              <span
                className="font-['Poppins'] font-medium tracking-[0.08em] uppercase leading-none"
                style={{ fontSize: 12, color: "rgba(242,207,177,0.45)" }}
              >
                Available Sessions
              </span>
              <button
                type="button"
                onClick={handleRefresh}
                title="Refresh sessions"
                className="flex items-center justify-center rounded-md p-1 hover:bg-white/8 transition-colors duration-150 cursor-pointer"
              >
                <RefreshCw
                  className={sessionsLoading ? "animate-spin" : ""}
                  style={{
                    width: 14,
                    height: 14,
                    color: "rgba(242,207,177,0.55)",
                  }}
                  strokeWidth={2}
                />
              </button>
            </div>
            <div
              style={{ marginLeft: 15, marginRight: 15, marginBottom: 5 }}
              className="border-t border-white/6"
            />

            <div
              className="custom-session-scroll overflow-y-auto"
              role="listbox"
              style={{
                maxHeight: 264,
                paddingTop: 6,
                paddingBottom: 6,
                paddingLeft: 8,
                paddingRight: 8,
              }}
            >
              <style>{`
                .custom-session-scroll::-webkit-scrollbar { width: 5px; }
                .custom-session-scroll::-webkit-scrollbar-track { background: transparent; }
                .custom-session-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.15); border-radius: 10px; }
                .custom-session-scroll::-webkit-scrollbar-thumb:hover { background: rgba(242,207,177,0.4); }
              `}</style>

              {sessionsLoading &&
                Array.from({ length: 3 }).map((_, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-[13px] rounded-lg"
                    style={{ paddingLeft: 15, paddingRight: 15, height: 43 }}
                  >
                    <div
                      className="h-[5px] w-[5px] shrink-0 animate-pulse rounded-full"
                      style={{ background: "rgba(255,255,255,0.2)" }}
                    />
                    <div
                      className="h-[9px] w-2/5 animate-pulse rounded-full"
                      style={{ background: "rgba(255,255,255,0.08)" }}
                    />
                  </div>
                ))}

              {!sessionsLoading && sessionsError && (
                <div
                  className="flex flex-col items-center justify-center gap-2 text-center"
                  style={{ paddingTop: 26, paddingBottom: 26 }}
                >
                  <AlertCircle
                    style={{ width: 20, height: 20, color: "#E2867A" }}
                    strokeWidth={1.75}
                  />
                  <span
                    className="font-['Poppins']"
                    style={{ fontSize: 12, color: "rgba(255,255,255,0.55)" }}
                  >
                    Couldn&apos;t load sessions
                  </span>
                  <button
                    onClick={handleRefresh}
                    className="font-['Poppins'] cursor-pointer"
                    style={{
                      fontSize: 11,
                      color: "rgba(242,207,177,0.65)",
                      background: "none",
                      border: "none",
                    }}
                  >
                    Try again
                  </button>
                </div>
              )}

              {!sessionsLoading && !sessionsError && sessions.length === 0 && (
                <div
                  className="flex flex-col items-center justify-center gap-2 text-center"
                  style={{ paddingTop: 26, paddingBottom: 26 }}
                >
                  <History
                    style={{
                      width: 20,
                      height: 20,
                      color: "rgba(255,255,255,0.25)",
                    }}
                    strokeWidth={1.75}
                  />
                  <span
                    className="font-['Poppins']"
                    style={{ fontSize: 12, color: "rgba(255,255,255,0.4)" }}
                  >
                    No sessions yet
                  </span>
                  <span
                    className="font-['Poppins']"
                    style={{ fontSize: 11, color: "rgba(255,255,255,0.22)" }}
                  >
                    Completed interviews will show up here
                  </span>
                </div>
              )}

              {!sessionsLoading &&
                !sessionsError &&
                sessions.map((session, i) => {
                  const isSessionActive = activeSession === session.id;
                  return (
                    <div
                      key={session.id}
                      role="option"
                      aria-selected={isSessionActive}
                      onClick={() => handleSessionClick(session.id, i)}
                      className={`flex items-center justify-between rounded-lg cursor-pointer transition-all duration-100 ${
                        isSessionActive ? "bg-white/8" : "hover:bg-white/5"
                      }`}
                      style={{
                        paddingLeft: 15,
                        paddingRight: 15,
                        height: 43,
                        marginTop: i !== 0 ? 2 : 0,
                      }}
                    >
                      <div
                        className="flex items-center min-w-0"
                        style={{ gap: 13 }}
                      >
                        <span
                          className="rounded-full shrink-0"
                          style={{
                            width: 5,
                            height: 5,
                            background: isSessionActive
                              ? "#F2CFB1"
                              : "rgba(255,255,255,0.2)",
                            opacity: isSessionActive ? 1 : 0.5,
                          }}
                        />
                        <span
                          className="font-['Poppins'] leading-none truncate"
                          style={{
                            fontSize: 15,
                            color: isSessionActive
                              ? "#F2CFB1"
                              : "rgba(255,255,255,0.62)",
                            fontWeight: isSessionActive ? 500 : 400,
                          }}
                        >
                          {session.candidate_name}
                        </span>
                      </div>
                      {isSessionActive && (
                        <Check
                          style={{
                            width: 17,
                            height: 17,
                            marginLeft: 10,
                            color: "#F2CFB1",
                          }}
                          strokeWidth={2.5}
                        />
                      )}
                    </div>
                  );
                })}

              <div style={{ height: 4 }} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Panel;
