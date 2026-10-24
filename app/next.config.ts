import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import type { NextConfig } from "next";

const envFile = path.join(__dirname, "../.env");
if (existsSync(envFile)) {
  for (const line of readFileSync(envFile, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
    const index = trimmed.indexOf("=");
    const key = trimmed.slice(0, index);
    if (!process.env[key]) process.env[key] = trimmed.slice(index + 1);
  }
}

const nextConfig: NextConfig = {
  transpilePackages: ["@cdr/econ", "@cdr/fair", "@cdr/risk", "@cdr/pay", "@cdr/kyc", "@cdr/pricing", "@cdr/db"],
  poweredByHeader: false,
};

export default nextConfig;
