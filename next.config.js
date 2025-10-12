/** @type {import('next').NextConfig} */
const nextConfig = {
  // App Router is stable in Next.js 14, no experimental flag needed
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        port: '',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
  // Disable static optimization
  trailingSlash: false,
}

module.exports = nextConfig
