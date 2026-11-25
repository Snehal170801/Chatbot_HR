import MAINBG from "../../assets/MAINBG.svg";

const Background = ({ children }: { children: React.ReactNode }) => {
  return (
    <div
      className="relative w-full overflow-hidden"
      style={{
        height: "100dvh",
        minHeight: "-webkit-fill-available", // iOS Safari fix
        /*
          CSS background-image is far more reliable than <img object-cover>
          for SVGs across all browsers and mobile devices.
          background-size: cover + background-position: center
          guarantees full coverage on any viewport size/orientation.
        */
        backgroundImage: `url(${MAINBG})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      }}
    >
      {/* Dark overlay + blur — sits above background image */}
      <div className="absolute inset-0 bg-black/46 backdrop-blur-[30px]" />

      {/*
        Positioning context for Sidebar, Navbar, and main scroll area.
        No overflow here — scroll lives in AppLayout's <main>.
      */}
      <div className="relative z-10 h-full w-full">{children}</div>
    </div>
  );
};

export default Background;
