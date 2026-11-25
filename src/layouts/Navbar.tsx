import { Bell, Menu } from "lucide-react";
import { useState } from "react";
import { useBackendHealth } from "../hooks/useBackendHealth";

interface NavbarProps {
  onMenuClick?: () => void;
  collapsed?: boolean;
  onNotification?: () => void;
  onAvatarClick?: () => void;
  initials?: string;
}

const STATUS_CONFIG = {
  online: {
    color: "#4ADE80",
    shadow: "0 0 6px 2px #4ADE8066",
    label: "HR Is Online",
  },
  offline: {
    color: "#FF6B6B",
    shadow: "0 0 6px 2px #FF6B6B66",
    label: "HR Is Offline",
  },
  checking: { color: "#FFCEA5", shadow: "none", label: "Checking..." },
};

const Navbar = ({
  onMenuClick,
  collapsed = false,
  onNotification,
  onAvatarClick,
  initials = "TK",
}: NavbarProps) => {
  const [hasUnread, setHasUnread] = useState(true);
  const backendStatus = useBackendHealth();
  const cfg = STATUS_CONFIG[backendStatus];

  const handleNotification = () => {
    setHasUnread(false);
    onNotification?.();
  };

  return (
    <>
      <style>{`
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }
      `}</style>

      {/*
        fixed  → truly sticky — won't scroll with page content on any screen
        mobile : top-4 left-4 right-4  (16px all sides)
        desktop: top-[17px] left-[366px] right-[17px]
                 366 = sidebar left(36) + sidebar width(317) + gap(13)
      */}
      <div
        className={`fixed z-20 rounded-[12px] border border-white/10
                   top-4 left-4 right-4
                   transition-[left] duration-300
                   lg:top-[17px] lg:right-[17px] ${
                     collapsed ? "lg:left-[115px]" : "lg:left-[285px]"
                   }`}
        style={{
          height: 72,
          background:
            "linear-gradient(180deg, rgba(242, 207, 177, 0.27) 0%, rgba(95, 64, 38, 0.27) 100%)",
        }}
      >
        {/*
          Single flex row — justify-between keeps left and right groups apart.
          No more absolute-positioned children, no hardcoded left/top values inside.
        */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            height: "100%",
            paddingLeft: 20,
            paddingRight: 24,
          }}
        >
          {/* ── LEFT: Hamburger (mobile) + Status indicator ── */}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {/* Hamburger — hidden on desktop */}
            <button
              onClick={onMenuClick}
              className="flex"
              style={{
                alignItems: "center",
                justifyContent: "center",
                width: 36,
                height: 36,
                background: "transparent",
                border: "none",
                cursor: "pointer",
                padding: 0,
                marginRight: 4,
              }}
            >
              <Menu style={{ width: 22, height: 22, color: "#F1CFB1" }} />
            </button>

            {/* Status dot + label */}
            <div
              title={cfg.label}
              style={{ display: "flex", alignItems: "center", gap: 8 }}
            >
              <span
                style={{
                  display: "inline-block",
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: cfg.color,
                  boxShadow: cfg.shadow,
                  flexShrink: 0,
                  transition: "background 0.5s, box-shadow 0.5s",
                  animation:
                    backendStatus === "checking"
                      ? "pulse 1.2s ease-in-out infinite"
                      : "none",
                }}
              />
              <span
                style={{
                  fontFamily: "Poppins",
                  fontSize: 12,
                  color: cfg.color,
                  opacity: 0.85,
                  userSelect: "none",
                  transition: "color 0.5s",
                  whiteSpace: "nowrap",
                }}
              >
                {cfg.label}
              </span>
            </div>
          </div>

          {/* ── RIGHT: Bell + Avatar ── */}
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            {/* Bell */}
            <button
              onClick={handleNotification}
              style={{
                position: "relative",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 30,
                height: 30,
                background: "transparent",
                border: "none",
                cursor: "pointer",
                padding: 0,
                opacity: 1,
                transition: "opacity 0.15s",
              }}
            >
              <Bell
                style={{ width: 28, height: 28, color: "#F1CFB1" }}
                strokeWidth={1.5}
              />
              {hasUnread && (
                <span
                  style={{
                    position: "absolute",
                    width: 8,
                    height: 8,
                    top: 0,
                    right: 0,
                    borderRadius: "50%",
                    background: "#F2CFB1",
                    border: "1.5px solid rgba(4,4,4,0.8)",
                  }}
                />
              )}
            </button>

            {/* Avatar */}
            <button
              onClick={onAvatarClick}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 37,
                height: 37,
                borderRadius: "50%",
                border: "none",
                cursor: "pointer",
                padding: 0,
                background: "linear-gradient(180deg, #886851 0%, #F1CFB1 100%)",
                transition: "opacity 0.15s",
              }}
            >
              <span
                style={{
                  fontFamily: "Poppins",
                  fontWeight: 500,
                  fontSize: 15,
                  lineHeight: "22px",
                  color: "#FFFFFF",
                }}
              >
                {initials}
              </span>
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default Navbar;
