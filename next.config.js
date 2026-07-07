/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      allowedOrigins: [
        'localhost:3000',
        'steriletrak.com',
        'www.steriletrak.com',
        'sterile-track-pi.vercel.app',
      ],
    },
  },
}

module.exports = nextConfig
