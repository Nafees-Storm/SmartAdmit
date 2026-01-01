import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    eslint: {
        ignoreDuringBuilds: true,
    },

    typescript: {
        ignoreBuildErrors: true,
    },

    experimental: {
        serverActions: {
            bodySizeLimit: "16mb", // allows document uploads for OCR
        },
    },
};

export default nextConfig;
