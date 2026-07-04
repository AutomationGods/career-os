const isProductionBuild = process.env.NODE_ENV === "production";

const nextConfig = {
  distDir: isProductionBuild ? ".next" : ".next-dev",
  experimental: {
    serverComponentsExternalPackages: ["pdf-parse"]
  }
};

export default nextConfig;
