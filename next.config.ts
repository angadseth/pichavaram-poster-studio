import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  // Native / fs-heavy packages stay out of the bundle.
  serverExternalPackages: ["@libsql/client", "nodemailer", "sharp"],
  // Full-size house crests are read from disk to attach to designers' emails.
  outputFileTracingIncludes: {
    "/**": ["./assets/houses/**/*"],
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
