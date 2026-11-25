import { useState } from "react";
import Background from "../components/Background/Background";
import Sidebar from "./Sidebar";
import Navbar from "./Navbar";
import Dashboard from "../pages/Dashboard";
import Reports from "../pages/Reports";

/*
  Layout:
  ┌──────────────────────────────────────────┐
  │  Sidebar (fixed drawer on mobile,        │
  │           absolute on desktop)           │
  │  Navbar  (fixed on all screens)          │
  │                                          │
  │  <main>  (absolute inset-0, scrollable,  │
  │           padded to clear chrome)        │
  │                                          │
  │  mobile : pt-[104px]                     │
  │  desktop: pt-[105px] pl-[369px]          │
  └──────────────────────────────────────────┘
*/

type Page = "Dashboard" | "Report" | "Setting";

const AppLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [activePage, setActivePage] = useState<Page>("Dashboard");

  const renderPage = () => {
    switch (activePage) {
      case "Report":
        return <Reports />;
      case "Dashboard":
      default:
        return <Dashboard />;
    }
  };

  return (
    <Background>
      <Sidebar
        isOpen={sidebarOpen}
        collapsed={collapsed}
        onClose={() => setSidebarOpen(false)}
        onNavigate={(label) => setActivePage(label as Page)}
      />
      <Navbar
        collapsed={collapsed}
        onMenuClick={() => {
          if (window.matchMedia("(min-width: 1024px)").matches) {
            setCollapsed((v) => !v);
          } else {
            setSidebarOpen((v) => !v);
          }
        }}
      />

      {/*
        Scrollable content area.
        top-[104px]  = navbar top(16) + height(72) + gap(16)
        lg:pl-[369px] = sidebar left(36) + width(317) + gap(16)
      */}
      <main
        style={{
          position: "absolute",
          inset: 0,
          overflowY: "auto",
          overflowX: "hidden",
          paddingTop: 104,
          paddingBottom: 16,
          paddingLeft: 16,
          paddingRight: 16,
        }}
        className={`transition-[padding] duration-300 lg:!pr-[17px] lg:!pt-[105px] ${
          collapsed ? "lg:!pl-[115px]" : "lg:!pl-[285px]"
        }`}
      >
        {renderPage()}
      </main>
    </Background>
  );
};

export default AppLayout;
