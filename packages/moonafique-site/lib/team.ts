export const teamMembers = [
  { slug: "jess", name: "Jess" },
  { slug: "reuben", name: "Reuben" },
  { slug: "megan", name: "Megan" },
  { slug: "keyara", name: "Keyara" },
  { slug: "eliza", name: "Eliza" },
  { slug: "ethan", name: "Ethan" },
  { slug: "sophia", name: "Sophia" },
  { slug: "alex", name: "Alex" },
  { slug: "ruby", name: "Ruby" },
] as const;
export type TeamSlug = typeof teamMembers[number]["slug"];
export const projectCategories = [
  { slug: "custom-grimms", name: "Custom Grimms", detail: "Paint, personality, and little details." },
  { slug: "custom-boxes", name: "Custom boxes", detail: "A little wonder, inside and out." },
  { slug: "art-cards", name: "Art cards", detail: "Small canvases. Plenty of imagination." },
] as const;
export type TeamProject = {
  slug: string;
  creator: TeamSlug;
  category: typeof projectCategories[number]["slug"];
  title: string;
  description: string;
  image: { src: string; alt: string; width: number; height: number };
};
// Add a project only after its image and creator credit are confirmed.
// Empty categories are gallery placeholders, not claims of authorship.
export const teamProjects: TeamProject[] = [];
