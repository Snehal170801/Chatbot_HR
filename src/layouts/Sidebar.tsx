import { LayoutDashboard, Library, Settings, LogOut, X } from "lucide-react";
import { useState } from "react";

const navItems = [
  { icon: LayoutDashboard, label: "Dashboard" },
  { icon: Library, label: "Report" },
  { icon: Settings, label: "Setting" },
];

interface SidebarProps {
  isOpen?: boolean;
  collapsed?: boolean;
  onClose?: () => void;
  onNavigate?: (label: string) => void;
  onLogout?: () => void;
}

const Sidebar = ({
  isOpen = false,
  collapsed = false,
  onClose,
  onNavigate,
  onLogout,
}: SidebarProps) => {
  const [activeLabel, setActiveLabel] = useState("Dashboard");

  const handleNavClick = (label: string) => {
    setActiveLabel(label);
    onNavigate?.(label);
    onClose?.();
  };

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
          onClick={onClose}
        />
      )}

      <div
        className={`
          fixed lg:absolute z-40
          top-0 left-0 lg:top-[17px] lg:left-[17px]
          w-[min(280px,calc(100vw-24px))] ${collapsed ? "lg:w-[90px]" : "lg:w-[260px]"}
          h-dvh lg:h-[calc(100dvh-34px)]
          rounded-r-[12px] lg:rounded-[12px]
          border border-white/10
          flex flex-col
          transition-[transform,width] duration-300 overflow-hidden ease-in-out
          ${isOpen ? "translate-x-0" : "-translate-x-full"}
          lg:translate-x-0
        `}
        style={{
          background:
            "linear-gradient(180deg, rgba(242, 207, 177, 0.27) 0%, rgba(95, 64, 38, 0.27) 100%)",
        }}
      >
        {/* HEADER — logo centered, X balanced by spacer */}
        <div
          className="flex-shrink-0 grid grid-cols-[2rem_1fr_2rem] items-center lg:flex lg:justify-center"
          style={{
            paddingTop: 40,
            paddingBottom: 28,
            paddingLeft: 20,
            paddingRight: 20,
          }}
        >
          <div className="lg:hidden" />

          <img
            src="/Cognexa-logo-Final-File-01-removebg-preview.png"
            alt="Cognexa"
            draggable={false}
            className={collapsed ? "lg:hidden" : ""}
            style={{
              width: 170,
              maxWidth: "100%",
              height: "auto",
              justifySelf: "center",
              filter: "brightness(0) invert(1)",
              userSelect: "none",
            }}
          />

          {/* Compact mark (first two letters of the wordmark) shown when collapsed */}
          {collapsed && (
            <div
              className="hidden lg:block"
              style={{
                width: 48,
                height: 28,
                overflow: "hidden",
                justifySelf: "center",
              }}
            >
              <img
                src="/Cognexa-logo-Final-File-01-removebg-preview.png"
                alt="Cognexa"
                draggable={false}
                style={{
                  width: 165,
                  maxWidth: "none",
                  height: "auto",
                  filter: "brightness(0) invert(1)",
                  userSelect: "none",
                }}
              />
            </div>
          )}

          <button
            onClick={onClose}
            className="flex lg:hidden"
            style={{
              alignItems: "center",
              justifyContent: "center",
              width: 32,
              height: 32,
              background: "transparent",
              border: "none",
              cursor: "pointer",
              color: "rgba(255,255,255,0.6)",
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* NAV ITEMS */}
        <nav
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            gap: 6,
            paddingLeft: 18,
            paddingRight: 18,
            overflowY: "auto",
          }}
        >
          {navItems.map(({ icon: Icon, label }) => {
            const active = activeLabel === label;
            return (
              <button
                key={label}
                onClick={() => handleNavClick(label)}
                style={{
                  display: "flex",
                  flexDirection: "row",
                  alignItems: "center",
                  width: "100%",
                  height: 48,
                  padding: 12,
                  gap: 13,
                  borderRadius: 12,
                  flexShrink: 0,
                  border: "none",
                  cursor: "pointer",
                  background: active ? "rgba(255,255,255,0.1)" : "transparent",
                  transition: "background 0.15s",
                }}
              >
                <Icon
                  style={{
                    width: 30,
                    height: 30,
                    flexShrink: 0,
                    color: active ? "#F1CFB1" : "#886851",
                  }}
                />
                <span
                  className={collapsed ? "lg:hidden" : ""}
                  style={{
                    fontFamily: "Poppins",
                    fontWeight: 400,
                    fontSize: 14,
                    lineHeight: "22px",
                    color: "rgba(255,255,255,0.8)",
                  }}
                >
                  {label}
                </span>
              </button>
            );
          })}
        </nav>

        {/* FOOTER */}
        <div
          style={{
            flexShrink: 0,
            paddingLeft: 18,
            paddingRight: 18,
            paddingBottom: 32,
          }}
        >
          <div
            style={{
              height: 1,
              background: "rgba(255,255,255,0.12)",
              marginBottom: 12,
            }}
          />
          <button
            onClick={onLogout}
            style={{
              display: "flex",
              flexDirection: "row",
              alignItems: "center",
              width: "100%",
              height: 48,
              padding: 12,
              gap: 13,
              borderRadius: 12,
              border: "none",
              cursor: "pointer",
              background: "transparent",
              transition: "background 0.15s",
            }}
          >
            <LogOut
              style={{
                width: 30,
                height: 30,
                color: "#886851",
                transform: "rotate(180deg)",
              }}
            />
            <span
              className={collapsed ? "lg:hidden" : ""}
              style={{
                fontFamily: "Poppins",
                fontWeight: 400,
                fontSize: 14,
                lineHeight: "22px",
                color: "rgba(255,255,255,0.8)",
              }}
            >
              Log Out
            </span>
          </button>
        </div>
      </div>
    </>
  );
};

export default Sidebar;
