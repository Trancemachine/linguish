import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 👇 这行是解决 tesseract.js 在 Vercel 构建问题的关键配置
  serverExternalPackages: ["tesseract.js"],
};

export default nextConfig;