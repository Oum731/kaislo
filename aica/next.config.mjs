const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  outputFileTracingRoot: import.meta.dirname,
  experimental: { serverActions: { bodySizeLimit: '4mb' } },
  serverExternalPackages: ['sharp', 'postgres'],
};
export default nextConfig;
