/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  allowedDevOrigins: [
    "localhost",
    "127.0.0.1",
    "*.remote-agent.svc.cluster.local",
    "*.preview.agent-sandbox-my-b1-gw.trae.ai",
    "*.preview.agent-sandbox-my-c1-gw.trae.ai"
  ]
};

export default nextConfig;
