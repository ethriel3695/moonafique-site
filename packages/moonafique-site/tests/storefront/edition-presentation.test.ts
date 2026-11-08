import { describe, expect, it } from "vitest";
import { editionLabel, editionMonth } from "../../lib/grimmunity/presentation";

describe("customer edition labels", () => {
  it("turns the automatic duplicated month into one readable collection label", () => {
    expect(editionLabel({ title: "Moonafique collections · 2026-11", month: "2026-11" })).toBe("November 2026 collection");
  });
  it("preserves custom titles and avoids repeating either month format", () => {
    for (const title of ["Winter Mischief", "Winter Mischief · 2027-01", "Winter Mischief · January 2027"])
      expect(editionLabel({ title, month: "2027-01" })).toBe("Winter Mischief · January 2027");
  });
  it("keeps the edition's calendar month at year boundaries", () => {
    expect(editionMonth("2027-01")).toBe("January 2027");
    expect(editionMonth("2026-12")).toBe("December 2026");
  });
  it("leaves unexpected stored month values readable without throwing", () => {
    expect(editionMonth("Coming soon")).toBe("Coming soon");
    expect(editionMonth("2026-13")).toBe("2026-13");
  });
});
