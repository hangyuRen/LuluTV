import path from "path";
import { networkInterfaces } from "node:os";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/** @type {import('next').NextConfig} */
const nextConfig = {
  devIndicators: false,
  // A bare "*" is rejected by Next.js. Match IPv4 hosts and include this
  // machine's IPv6 addresses for LAN access in development.
  allowedDevOrigins: [
    "*.*.*.*",
    ...Object.values(networkInterfaces()).flat().filter(Boolean)
      .filter((address) => address.family === "IPv6")
      .map((address) => `[${address.address}]`),
  ],
  reactStrictMode: false,
  reactCompiler: true,
  output: "standalone",
  experimental: {
    agentUpgrade: "security",
  },
  // 明确指定 Turbopack 的工作区根目录，避免被父目录的 lockfile 误导
  turbopack: {
    root: __dirname, // 使用绝对路径指向项目根目录
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.doubanio.com",
      },
      {
        protocol: "https",
        hostname: "tncache1-f1.v3mh.com",
      },
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
    ],
  },
};

export default nextConfig;
