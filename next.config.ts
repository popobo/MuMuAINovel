import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  onDemandEntries: {
    // Periodically check for updates to pages
    maxInactiveAge: 60 * 1000,
    pagesBufferLength: 2,
  },
};

export default nextConfig;
