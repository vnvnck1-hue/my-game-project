import { defineConfig } from "vite";

const port = process.env.PORT ? Number(process.env.PORT) : 5173;

export default defineConfig({
  server: {
    host: true,
    port,
    strictPort: false,
    open: false,
  },
  build: {
    target: "es2022",
    sourcemap: true,
  },
});
