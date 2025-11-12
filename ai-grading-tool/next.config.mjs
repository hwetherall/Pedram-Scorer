/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    return [
      {
        source: '/',
        destination: '/wizard',
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
