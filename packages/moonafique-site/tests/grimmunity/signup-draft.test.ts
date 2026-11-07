import { describe, expect, it } from "vitest";
import { blankSignupFields, saveSignupDraft, signupDraftLifetime, takeSignupDraft } from "@/lib/grimmunity/signup-draft";
import { membershipSignInUrl, signInReturnPath } from "@/lib/sign-in-return";

function memoryStorage() {
  const values = new Map<string, string>();
  return { values, getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value); }, removeItem: (key: string) => { values.delete(key); } };
}
const draft = { scope: "live:grimm:november", tierId: "grimm_starter", billingMonths: 6 as const, fields: { ...blankSignupFields, name: "Test Visitor", line1: "123 Example St", color_0: "purple", avoided_colors: "red" } };

describe("membership sign-in continuity", () => {
  it("restores editable choices once, without quote, consent, payment data or idempotency keys", () => {
    const storage = memoryStorage();
    expect(saveSignupDraft(storage, { ...draft, quote: "private", consent: true, requestKey: "key", payment: "card" } as typeof draft, 1000)).toBe(true);
    expect([...storage.values.values()][0]).not.toMatch(/quote|consent|requestKey|payment|card/);
    const restored = takeSignupDraft(storage, draft.scope, ["grimm_starter"], ["US"], 2000);
    expect(restored).toMatchObject(draft);
    expect(takeSignupDraft(storage, draft.scope, ["grimm_starter"], ["US"], 2000)).toBeNull();
  });
  it.each(["expired", "new-edition", "tier-unavailable", "country-unavailable", "future"]) ("discards a %s draft", reason => {
    const storage = memoryStorage();
    saveSignupDraft(storage, draft, 100_000);
    const result = takeSignupDraft(storage, reason === "new-edition" ? "live:grimm:december" : draft.scope,
      reason === "tier-unavailable" ? ["grimm_keeper"] : ["grimm_starter"], reason === "country-unavailable" ? ["CA"] : ["US"],
      reason === "expired" ? 100_000 + signupDraftLifetime + 1 : reason === "future" ? 0 : 100_001);
    expect(result).toBeNull();
    expect(storage.values.size).toBe(0);
  });
  it("does not mix ACEO and Grimm drafts or save extra fields", () => {
    const storage = memoryStorage();
    saveSignupDraft(storage, { ...draft, fields: { ...draft.fields, secret: "excluded" } } as typeof draft);
    expect(takeSignupDraft(storage, "live:aceo:november", ["aceo_prints"], ["US"])).toBeNull();
    expect([...storage.values.values()][0]).not.toContain("excluded");
  });
  it("handles damaged storage and unavailable browser storage without losing the live form", () => {
    const storage = memoryStorage();
    storage.setItem("moonafique:signup-draft:live:grimm", "not-json");
    expect(takeSignupDraft(storage, draft.scope, ["grimm_starter"], ["US"])).toBeNull();
    const blocked = { getItem() { throw Error("blocked"); }, setItem() { throw Error("blocked"); }, removeItem() { throw Error("blocked"); } };
    expect(saveSignupDraft(blocked, draft)).toBe(false);
    expect(takeSignupDraft(blocked, draft.scope, ["grimm_starter"], ["US"])).toBeNull();
  });
  it("preserves only the intended local membership return marker", () => {
    expect(signInReturnPath("/grimmunity?resume=membership&email=private#ignored")).toBe("/grimmunity?resume=membership");
    expect(signInReturnPath("/aceos?resume=membership")).toBe("/aceos?resume=membership");
    expect(signInReturnPath("/grim-club")).toBe("/grimmunity");
    expect(signInReturnPath("/account/grim-club")).toBe("/account/grimmunity");
    expect(signInReturnPath("/account/grimmunity?resume=membership")).toBe("/account/grimmunity");
    expect(membershipSignInUrl("/grimmunity")).toBe("/sign-in?returnTo=%2Fgrimmunity%3Fresume%3Dmembership");
    for (const unsafe of [null, "//evil.example", "/\\evil.example", "https://evil.example", "/admin", "/%2f%2fevil.example"]) expect(signInReturnPath(unsafe)).toBeUndefined();
  });
});
