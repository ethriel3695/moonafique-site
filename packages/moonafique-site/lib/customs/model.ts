import { z } from "zod";

export const statusLabels = {
  new: "New",
  reviewing: "Reviewing",
  in_progress: "In progress",
  completed: "Completed",
  declined: "Declined",
} as const;
export const statusSchema = z.enum(["new", "reviewing", "in_progress", "completed", "declined"]);
export type RequestStatus = z.infer<typeof statusSchema>;
export const acknowledgementVersion = "custom-request-received-order-v2";

export function shopToday(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Boise", year: "numeric", month: "2-digit", day: "2-digit",
  }).format(now);
}

export const requestInput = z.object({
  submissionKey: z.string().uuid(),
  name: z.string().trim().min(1, "Please enter your name.").max(120),
  email: z.union([z.literal(""), z.string().trim().toLowerCase().max(254).email("Enter a valid email address.")]).default(""),
  whatnotUsername: z.string().trim().max(81).transform((s) => s.replace(/^@/, ""))
    .refine((s) => !s || /^[A-Za-z0-9._-]{1,80}$/.test(s), "Enter your Whatnot username, without a profile link.").default(""),
  request: z.string().trim().min(10, "Tell us a little more about your idea (at least 10 characters).").max(3000),
  details: z.string().trim().max(4000).default(""),
  hasDeadline: z.boolean(),
  neededBy: z.string().max(10).default(""),
  occasion: z.string().trim().max(300).default(""),
  acknowledged: z.literal(true, { error: "Please acknowledge that this is a request, not a confirmed order." }),
  website: z.string().max(200).default(""),
}).superRefine((data, ctx) => {
  if (!data.email && !data.whatnotUsername)
    ctx.addIssue({ code: "custom", path: ["email"], message: "Add an email address or Whatnot username so we can contact you." });
  if (data.hasDeadline) {
    const parsed = new Date(`${data.neededBy}T12:00:00Z`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(data.neededBy) || !Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== data.neededBy)
      ctx.addIssue({ code: "custom", path: ["neededBy"], message: "Choose a valid needed-by date." });
  }
});

export const staffUpdateInput = z.object({
  id: z.string().uuid(),
  revision: z.number().int().positive(),
  status: statusSchema,
  staffNotes: z.string().trim().max(4000),
});

export type CustomRequest = {
  id: string;
  name: string;
  email: string | null;
  whatnot_username: string | null;
  request: string;
  details: string;
  needed_by: string | null;
  occasion: string;
  status: RequestStatus;
  staff_notes: string;
  revision: number;
  created_at: Date;
  updated_at: Date;
  notifications: { kind: "staff" | "customer"; state: "pending" | "sent" | "review" }[];
};
