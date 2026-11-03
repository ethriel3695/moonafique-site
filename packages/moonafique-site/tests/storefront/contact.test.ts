import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ send: vi.fn(), limited: vi.fn() }));
vi.mock("resend", () => ({
  Resend: class {
    emails = { send: mocks.send };
  },
}));
vi.mock("@/lib/rate-limit", () => ({ isRateLimited: mocks.limited }));
import { POST } from "@/app/api/contact/route";
const payload = {
  name: "A Collector",
  email: "collector@example.invalid",
  subject: "A piece",
  message: "Could you tell me about it?",
  company: "",
  submissionKey: "11111111-1111-4111-8111-111111111111",
};
function request(
  body: unknown = payload,
  origin = "https://www.moonafique.com",
) {
  return new Request("https://www.moonafique.com/api/contact", {
    method: "POST",
    headers: { origin, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("RESEND_API_KEY", "test-key");
  vi.stubEnv("CONTACT_SEND_EMAILS", "approved");
  vi.stubEnv("VERCEL_ENV", "production");
  mocks.limited.mockReturnValue(false);
  mocks.send.mockResolvedValue({ data: { id: "test-message" }, error: null });
});
afterEach(() => vi.unstubAllEnvs());
describe("contact message delivery", () => {
  it.each([
    ["http://127.0.0.1:3052", "127.0.0.1:3052", "http"],
    ["https://www.moonafique.com", "www.moonafique.com", "https"],
  ])(
    "accepts the public origin %s when Next uses an internal host",
    async (origin, host, protocol) => {
      const response = await POST(
        new Request("http://localhost:3052/api/contact", {
          method: "POST",
          headers: {
            origin,
            host,
            "x-forwarded-proto": protocol,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        }),
      );
      expect(response.status).toBe(200);
      expect(mocks.send).toHaveBeenCalledTimes(1);
    },
  );

  it("sends to the fixed studio inbox with a reply address and retry key", async () => {
    const response = await POST(request());
    expect(response.status).toBe(200);
    expect(mocks.send).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "hello@moonafique.com",
        replyTo: payload.email,
        text: expect.stringContaining(payload.message),
      }),
      { idempotencyKey: `contact/${payload.submissionKey}` },
    );
  });
  it.each(["preview", "development"])(
    "keeps %s reviews from sending real mail",
    async (environment) => {
      vi.stubEnv("VERCEL_ENV", environment);
      expect((await POST(request())).status).toBe(503);
      expect(mocks.send).not.toHaveBeenCalled();
    },
  );
  it("requires deliberate delivery configuration", async () => {
    vi.stubEnv("CONTACT_SEND_EMAILS", "disabled");
    expect((await POST(request())).status).toBe(503);
    expect(mocks.send).not.toHaveBeenCalled();
  });
  it("rejects cross-origin, malformed, and invalid messages", async () => {
    expect((await POST(request(payload, "https://other.invalid"))).status).toBe(
      403,
    );
    expect((await POST(request({ ...payload, email: "invalid" }))).status).toBe(
      400,
    );
    expect(
      (await POST(request({ ...payload, subject: "Header\r\nInjected" })))
        .status,
    ).toBe(400);
    expect(mocks.send).not.toHaveBeenCalled();
  });
  it("does not report failed provider delivery as success or expose provider errors", async () => {
    mocks.send.mockResolvedValue({
      data: null,
      error: { message: "secret provider detail" },
    });
    const response = await POST(request());
    expect(response.status).toBe(503);
    expect(await response.text()).not.toContain("secret");
    mocks.send.mockRejectedValue(new Error("secret"));
    expect((await POST(request())).status).toBe(503);
  });
  it("discards honeypot submissions and rate limits repeated messages", async () => {
    expect((await POST(request({ ...payload, company: "spam" }))).status).toBe(
      200,
    );
    mocks.limited.mockReturnValue(true);
    expect((await POST(request())).status).toBe(429);
    expect(mocks.send).not.toHaveBeenCalled();
  });
});
