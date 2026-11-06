import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  return {
    plugins: [react()],
    server: {
      host: "localhost",
      hmr: true,
      watch: {
        ignored: ["**/node_modules/**"]
      },
      proxy: {
        "/api/pnr": {
          target: env.VITE_PNR_API_URL,
          changeOrigin: true,
          secure: true
        }
      }
    }
  };
});