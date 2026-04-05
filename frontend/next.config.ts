import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  typescript: {
    // This allows the build to finish even with TS errors
    ignoreBuildErrors: true,
  }
};

export default nextConfig;