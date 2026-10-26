import { z } from "zod";

const color = z.string().trim().min(1).max(40);
export const preferencesSchema = z
  .object({
    preferred_colors: z.array(color).length(6),
    avoided_colors: z.array(color).max(20),
  })
  .strict()
  .superRefine((value, context) => {
    const preferred = value.preferred_colors.map((c) =>
      c.toLocaleLowerCase("en-US"),
    );
    const avoided = value.avoided_colors.map((c) =>
      c.toLocaleLowerCase("en-US"),
    );
    if (new Set(preferred).size !== 6)
      context.addIssue({
        code: "custom",
        message: "Choose six different preferred colors.",
        path: ["preferred_colors"],
      });
    if (preferred.some((c) => avoided.includes(c)))
      context.addIssue({
        code: "custom",
        message: "A preferred color cannot also be a color to avoid.",
        path: ["avoided_colors"],
      });
  });
export type ColorPreferences = z.infer<typeof preferencesSchema>;
