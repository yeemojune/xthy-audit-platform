import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'export',
  basePath: '/xthy-audit-platform',
  assetPrefix: '/xthy-audit-platform/',
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
