import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  transpilePackages: [
    'react-d3-tree',
    'd3-selection',
    'd3-transition',
    'd3-zoom',
    'd3-dispatch',
    'd3-timer',
    'd3-interpolate',
    'd3-color',
    'd3-ease',
  ],
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
