
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  const apiUrl = env.PNR_API_URL || "https://pnrstatus.io/api/pnr";

  return {
    plugins: [react()],
    server: {
      host: "0.0.0.0",
      proxy: {
        "/api/pnr": {
          target: new URL(apiUrl).origin,
          changeOrigin: true,
          secure: true
        }
      }
    }
  };
});
