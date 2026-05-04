/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  allowedDevOrigins: [
    "localhost",
    "*.remote-agent.svc.cluster.local",
    "*.preview.agent-sandbox-my-c1-gw.trae.ai"
  ]
};

export default nextConfig;
