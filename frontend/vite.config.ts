import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  base: "./",
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src")
    }
  },
  server: {
    port: 5173,
    strictPort: true,
    watch: {
      ignored: ["**/release/**", "**/dist/**", "**/build/**", "**/.git/**"]
    }
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) {
            return undefined;
          }
          if (id.includes("@radix-ui")) {
            return "radix";
          }
          if (id.includes("@tanstack")) {
            return "query";
          }
          if (id.includes("framer-motion")) {
            return "motion";
          }
          if (id.includes("recharts")) {
            return "charts";
          }
          return "vendor";
        }
      }
    }
  }
});
