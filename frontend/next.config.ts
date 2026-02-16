/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    let backendUrl = process.env.BACKEND_URL || 'http://localhost:8000';

    // Sanitize: Remove trailing slashes and /api suffix if the user included it
    backendUrl = backendUrl.replace(/\/+$/, '');
    if (backendUrl.endsWith('/api')) {
      backendUrl = backendUrl.slice(0, -4);
    }

    return [
      {
        source: '/api/:path*',
        destination: `${backendUrl}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
