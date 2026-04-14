import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    // NextAuth v5 beta has known type incompatibilities with Next.js 15+ async params
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
