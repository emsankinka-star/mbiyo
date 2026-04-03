/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['localhost', 'api.mbiyo.cd', 'mbiyo-production.up.railway.app', 'storage.googleapis.com'],
    unoptimized: true,
  },
  compress: true,
  poweredByHeader: false,
};

module.exports = nextConfig;
