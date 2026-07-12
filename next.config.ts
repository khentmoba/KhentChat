import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        hostname: "*.public.blob.vercel-storage.com",
        protocol: "https",
      },
      {
        hostname: "storage.googleapis.com",
        protocol: "https",
      },
    ],
  },
  output: "standalone",
  poweredByHeader: false,
  reactCompiler: true,
};

export default nextConfig;
