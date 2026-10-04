import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Cada empresa entra por su subdominio: demo.localhost:3000, donjose.localhost:3000...
  allowedDevOrigins: ["*.localhost"],
};

export default nextConfig;
