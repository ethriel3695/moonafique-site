import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { expect, it } from "vitest";
import ShippingPolicyPage from "../../app/shipping/page";

it("displays shipping cents as customer-facing dollars", () => {
  const html = renderToString(createElement(ShippingPolicyPage));
  for (const amount of ["$7.00", "$15.00", "$100.00"]) expect(html).toContain(amount);
  for (const amount of ["$700.00", "$1,500.00", "$10,000.00"]) expect(html).not.toContain(amount);
  expect(html).toContain("United States");
  expect(html).toContain("does not apply to memberships");
});
