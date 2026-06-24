import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@prisma/client", "prisma"],
};

export default withSentryConfig(nextConfig, {
  org: "rentalhub",
  project: "rentalhub-backend",
  silent: !process.env.CI,
  widenClientFileUpload: false,
});
