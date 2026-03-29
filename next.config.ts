import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  logging: {
    // 减少 Next.js 的详细日志输出
    fetches: {
      fullUrl: false, // 不记录完整 URL
    },
  },
};

export default nextConfig;
