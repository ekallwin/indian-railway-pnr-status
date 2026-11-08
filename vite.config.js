import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  const apiUrl = env.PNR_API_URL;

  const stationUrl = env.STATION_API_URL ? new URL(env.STATION_API_URL) : null;

  const proxy = {
    "/api/pnr": {
      target: new URL(apiUrl).origin,
      changeOrigin: true,
      secure: true
    }
  };

  if (stationUrl) {
    proxy["/api/station"] = {
      target: stationUrl.origin,
      changeOrigin: true,
      secure: true,
      rewrite: (path) =>
        path.replace(
          /^\/api\/station\/([^/?#]+).*$/,
          `${stationUrl.pathname}?q=$1`
        )
    };
  }

  return {
    plugins: [react()],
    server: {
      host: "0.0.0.0",
      proxy
    }
  };
});