import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/customers": {
        target: "http://localhost:5001",
        changeOrigin: true,
        secure: false,
        bypass: (req) => {
          if (req.headers.accept && req.headers.accept.includes("text/html")) {
            return "/index.html";
          }
        },
      },
      "/products": {
        target: "http://localhost:5001",
        changeOrigin: true,
        secure: false,
        bypass: (req) => {
          if (req.headers.accept && req.headers.accept.includes("text/html")) {
            return "/index.html";
          }
        },
      },
      "/wishlist": {
        target: "http://localhost:5001",
        changeOrigin: true,
        secure: false,
        bypass: (req) => {
          if (req.headers.accept && req.headers.accept.includes("text/html")) {
            return "/index.html";
          }
        },
      },
      "/cart": {
        target: "http://localhost:5001",
        changeOrigin: true,
        secure: false,
        bypass: (req) => {
          if (req.headers.accept && req.headers.accept.includes("text/html")) {
            return "/index.html";
          }
        },
      },
      "/upload": {
        target: "http://localhost:5001",
        changeOrigin: true,
        secure: false,
      },
    },
  },
});
