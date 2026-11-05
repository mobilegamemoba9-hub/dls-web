import { resolve } from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// GitHub Pages phục vụ trang ở https://<tài khoản>.github.io/dls-web/ -> base phải là "/dls-web/".
// Đổi tên kho thì đổi BASE_PATH trong workflow (.github/workflows/deploy.yml), không cần sửa file này.
export default defineConfig({
  base: process.env.BASE_PATH || "/dls-web/",
  plugins: [react(), tailwindcss()],
  // (lát 6) 2 trang: index.html = web quản lý (đăng nhập) ; tra/index.html = trang tra tiến độ cho đối tác (công khai, không Firebase SDK)
  build: {
    chunkSizeWarningLimit: 1500,
    rollupOptions: { input: { main: resolve(import.meta.dirname, "index.html"), tra: resolve(import.meta.dirname, "tra/index.html") } },
  },
});
