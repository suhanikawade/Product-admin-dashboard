/** @type {import('next').NextConfig} */
const nextConfig = {
  allowedDevOrigins: ["10.154.248.10"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "cdn.dummyjson.com",
      },
      {
        protocol: "https",
        hostname: "www.flipkart.com",
      },
      {
        protocol: "https",
        hostname: "www.mywishcare.com",
      },
    ],
  },
};

export default nextConfig;
