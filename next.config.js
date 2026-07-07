/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      allowedOrigins: [
        'localhost:3000',
        'steriletrack.com',
        'www.steriletrack.com',
        'sterile-track-pi.vercel.app',
      ],
    },
  },
}

module.exports = nextConfig
