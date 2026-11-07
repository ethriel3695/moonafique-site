import { z } from "zod";
import type { TierId } from "./tiers";

export const signupDraftLifetime = 30 * 60_000;
export const signupFieldNames = ["color_0", "color_1", "color_2", "color_3", "color_4", "color_5", "avoided_colors", "name", "line1", "line2", "city", "state", "postal_code", "country"] as const;
export type SignupFields = Record<(typeof signupFieldNames)[number], string>;
export const blankSignupFields: SignupFields = {
  color_0: "", color_1: "", color_2: "", color_3: "", color_4: "", color_5: "", avoided_colors: "",
  name: "", line1: "", line2: "", city: "", state: "", postal_code: "", country: "US",
};
const color = z.string().max(40);
const draftSchema = z.object({
  version: z.literal(1), scope: z.string().max(200), createdAt: z.number().finite(),
  tierId: z.string(), billingMonths: z.union([z.literal(1), z.literal(6), z.literal(12)]),
  fields: z.object({
    color_0: color, color_1: color, color_2: color, color_3: color, color_4: color, color_5: color,
    avoided_colors: z.string().max(800), name: z.string().max(150), line1: z.string().max(150),
    line2: z.string().max(150), city: z.string().max(150), state: z.string().max(2),
    postal_code: z.string().max(150), country: z.string().length(2),
  }),
});
type Draft = z.infer<typeof draftSchema>;
type DraftStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;
const storageKey = (scope: string) => `moonafique:signup-draft:${scope.split(":").slice(0, 2).join(":")}`;

// Only editable choices are saved, in this browser tab. Quotes, consent, request
// keys, authentication data, and payment information never enter the draft.
export function saveSignupDraft(storage: DraftStorage, draft: Omit<Draft, "version" | "createdAt">, now = Date.now()) {
  try {
    const validated = draftSchema.parse({ ...draft, version: 1, createdAt: now });
    storage.setItem(storageKey(draft.scope), JSON.stringify(validated));
    return true;
  } catch { return false; }
}

export function takeSignupDraft(storage: DraftStorage, scope: string, tiers: TierId[], countries: string[], now = Date.now()) {
  try {
    const raw = storage.getItem(storageKey(scope));
    storage.removeItem(storageKey(scope));
    if (!raw || raw.length > 8000) return null;
    const result = draftSchema.safeParse(JSON.parse(raw));
    if (!result.success) return null;
    const draft = result.data;
    if (draft.scope !== scope || now - draft.createdAt > signupDraftLifetime || draft.createdAt > now + 60_000 || !tiers.includes(draft.tierId as TierId) || !countries.includes(draft.fields.country)) return null;
    return { ...draft, tierId: draft.tierId as TierId };
  } catch { return null; }
}
