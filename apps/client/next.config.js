/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['localhost', 'api.mbiyo.cd'],
    unoptimized: true,
  },
  // Optimisation pour connexions lentes
  compress: true,
  poweredByHeader: false,
};

module.exports = nextConfig;
