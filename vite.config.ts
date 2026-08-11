import { resolve } from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      input: {
        home: resolve(process.cwd(), "index.html"),
        archive: resolve(
          process.cwd(),
          "projects/mb4x-radio-archive/index.html",
        ),
      },
    },
  },
});
