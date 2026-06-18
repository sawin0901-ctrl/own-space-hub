import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./i18n.ts");

const nextConfig: NextConfig = {
  output: "standalone",
  poweredByHeader: false,
  reactStrictMode: true,
  images: { remotePatterns: [{ protocol: "https", hostname: "**" }] },
  serverExternalPackages: ["jsonwebtoken", "bcryptjs", "@prisma/client", "prisma"],
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals.push("jsonwebtoken", "jws", "jwa", "bcryptjs");
    }
    return config;
  },
};

export default withNextIntl(nextConfig);
