import { providerConfig } from "./configuration";

describe("provider configuration", () => {
  const originalTimeout = process.env.PROVIDER_REQUEST_TIMEOUT_MS;
  afterEach(() => {
    if (originalTimeout === undefined)
      delete process.env.PROVIDER_REQUEST_TIMEOUT_MS;
    else process.env.PROVIDER_REQUEST_TIMEOUT_MS = originalTimeout;
  });

  it("should allow long manuscript generation when no timeout is configured", () => {
    delete process.env.PROVIDER_REQUEST_TIMEOUT_MS;
    expect(providerConfig().requestTimeoutMs).toBe(600_000);
  });

  it("should preserve an explicit deployment timeout when configured", () => {
    process.env.PROVIDER_REQUEST_TIMEOUT_MS = "45000";
    expect(providerConfig().requestTimeoutMs).toBe(45_000);
  });
});
