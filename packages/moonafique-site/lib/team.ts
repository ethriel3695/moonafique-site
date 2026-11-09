import { novemberGrimmWorldPhotos } from "./project-photos";
import type { CreationPhoto } from "./creations-showcase";

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
export type TeamProject = {
  slug: string;
  title: string;
  occasion: string;
  description: string;
  creators: { slug: TeamSlug; role: string }[];
  photos: CreationPhoto[];
  collectionHref: string;
};

export const novemberGrimmWorld: TeamProject = {
  slug: "november-grimm-world",
  title: "November Grimm World",
  occasion: "November 2026 · Grimmfest",
  description: "A little autumn world, tucked inside a book. Open the leaf-decorated cover to discover a painted Grimm, tiny scenery, and a story waiting to unfold.",
  creators: [
    { slug: "keyara", role: "Design & painting" },
    { slug: "jess", role: "Box collaboration" },
  ],
  photos: novemberGrimmWorldPhotos,
  collectionHref: "/grimmunity#november-grimm-world",
};

// Shared credits place one project in each collaborator’s portfolio.
// Keep each person’s portfolio specific to their confirmed work.
export const teamProjects: TeamProject[] = [novemberGrimmWorld];
