import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Cache page segments in the client router cache so flicking back to a
    // recently-viewed tab is instant instead of re-hitting the server.
    // Server actions still call revalidatePath() to refresh after mutations.
    staleTimes: {
      dynamic: 30,
      static: 180,
    },
  },
};

export default nextConfig;
