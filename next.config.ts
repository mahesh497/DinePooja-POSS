import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return {
      beforeFiles: [
        { source: "/api/auth/:path+", destination: "/api/nextauth/:path+" },
      ],
    };
  },
};

export default nextConfig;
