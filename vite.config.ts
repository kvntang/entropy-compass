import vue from "@vitejs/plugin-vue";
import { join } from "path";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [vue()],
  base: "/",
  define: {
    'import.meta.env.HUGGINGFACE_API_TOKEN': JSON.stringify(process.env.HUGGINGFACE_API_TOKEN)
  },
  resolve: {
    alias: {
      "@": join(__dirname, "client"),
    },
  },
  server: {
    proxy: {
      "/api": {
        target: "http://localhost:3000",
        changeOrigin: true,
      },
    },
  },
});