const isProductionBuild = process.env.NODE_ENV === "production";

const nextConfig = {
  distDir: isProductionBuild ? ".next" : ".next-dev"
};

export default nextConfig;
