import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['bcryptjs', 'jsonwebtoken'],
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  webpack: (config: any) => {
    config.externals = config.externals || {};
    config.externals['bn.js'] = 'bn.js';
    config.externals['pbkdf2'] = 'pbkdf2';
    config.externals['secp256k1'] = 'secp256k1';
    return config;
  },
};

export default nextConfig;
