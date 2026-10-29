import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  // Native / fs-heavy packages stay out of the bundle.
  serverExternalPackages: ["@resvg/resvg-js", "@libsql/client", "satori", "nodemailer"],
  // Poster fonts are read from disk at runtime; ship them with every server route.
  outputFileTracingIncludes: {
    "/**": ["./assets/fonts/**/*"],
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
