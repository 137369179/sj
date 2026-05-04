import { describe, expect, it } from "vitest";

import nextConfig from "../next.config.mjs";

describe("next config", () => {
  it("allows local automation preview origins during development", () => {
    expect(nextConfig.output).toBe("standalone");
    expect(nextConfig.allowedDevOrigins).toEqual([
      "localhost",
      "127.0.0.1",
      "*.remote-agent.svc.cluster.local",
      "*.preview.agent-sandbox-my-b1-gw.trae.ai",
      "*.preview.agent-sandbox-my-c1-gw.trae.ai"
    ]);
  });
});
