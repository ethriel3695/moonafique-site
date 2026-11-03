import { z } from "zod";
export const contactSchema = z.object({
  name: z.string().trim().min(1, "Enter your name.").max(100),
  email: z.string().trim().email("Enter a valid email address.").max(254),
  subject: z
    .string()
    .trim()
    .min(1, "Enter a subject.")
    .max(120)
    .regex(/^[^\r\n]+$/, "Use one line for the subject."),
  message: z.string().trim().min(1, "Enter your message.").max(5000),
  company: z.string().max(200).default(""),
  submissionKey: z.uuid(),
});
export type ContactSubmission = z.infer<typeof contactSchema>;
