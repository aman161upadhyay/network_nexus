import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@neondatabase/serverless", "better-auth", "@google-cloud/vertexai", "googleapis", "google-auth-library"],
};

export default nextConfig;
