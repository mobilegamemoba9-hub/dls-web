import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// GitHub Pages phục vụ trang ở https://<tài khoản>.github.io/dls-web/ -> base phải là "/dls-web/".
// Đổi tên kho thì đổi BASE_PATH trong workflow (.github/workflows/deploy.yml), không cần sửa file này.
export default defineConfig({
  base: process.env.BASE_PATH || "/dls-web/",
  plugins: [react(), tailwindcss()],
  build: { chunkSizeWarningLimit: 1500 },
});
