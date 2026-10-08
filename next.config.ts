import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingIncludes: {
    "/api/trade-documents/*/pdf": ["./assets/trade-documents/**/*"],
    "/api/trade-documents/*/issue": ["./assets/trade-documents/**/*"],
  },
  turbopack: {
    root: process.cwd(),
  },
};

export default nextConfig;
