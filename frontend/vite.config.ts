import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      buffer: "buffer/",
      process: "process/browser",
    },
  },
  optimizeDeps: {
    include: ["buffer", "process"],
  },
  server: {
    host: "0.0.0.0",
    port: 5173,
  },
});
