import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import basicSsl from "@vitejs/plugin-basic-ssl";

const BACKEND = "http://192.168.10.9:8008";

export default defineConfig({
  plugins: [react(), tailwindcss(), basicSsl()],

  server: {
    host: "0.0.0.0",
    port: 5173,
    https: true,
    // Backend is proxied so the HTTPS dev page can reach it (no mixed-content
    // blocking, no CORS). Set BACKEND below to wherever FastAPI is running.
    proxy: {
      "/api": { target: BACKEND, changeOrigin: true },
      "/health": { target: BACKEND, changeOrigin: true },
      "/ws": { target: BACKEND.replace(/^http/, "ws"), changeOrigin: true, ws: true },
    },
  },
});
