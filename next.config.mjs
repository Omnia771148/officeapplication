/** @type {import('next').NextConfig} */
const nextConfig = {
  /* config options here - touched to restart server 1792435214201*/
  reactCompiler: true,
  allowedDevOrigins: [
    '192.168.10.34',
    '192.168.10.34:3000',
    'localhost',
    '127.0.0.1',
  ],
};

export default nextConfig;
