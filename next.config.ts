import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
    ];
  },
  async redirects() {
    return [
      // Stories is the home of this project (see src/app/page.tsx); these keep old About Us links working.
      { source: "/about", destination: "/about-us", permanent: true },
      { source: "/our-story", destination: "/about-us", permanent: true },
    ];
  },
};

export default nextConfig;
