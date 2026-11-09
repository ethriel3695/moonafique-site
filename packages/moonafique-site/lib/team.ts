import { jessAceoPhotos, novemberGrimmWorldPhotos, novemberGrimmOfTheMonthPhotos, elizaCustomGrimmPhotos, elizaPetPhotos, elizaRainbowStarsPhotos } from "./project-photos";
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

export const teamProfiles: Partial<Record<TeamSlug, { role: string; bio: string[] }>> = {
  jess: {
    role: "CEO · Creative vision & live-show host",
    bio: [
      "Jess is the creative spark and familiar face of Moonafique. As CEO, designer, and ACEO artist, she dreams up the characters, tiny artworks, and wonderfully unexpected ideas that make this little world our own.",
      "On Whatnot, she brings that imagination to the camera, sharing the creations, welcoming collectors, and inviting everyone into a little Moonafique mischief. She and Keyara also photograph our Print Wars pieces, capturing the details that make each creation special.",
    ],
  },
  reuben: {
    role: "COO · Operations & design",
    bio: [
      "Reuben keeps the Moonafique world turning behind the scenes. As COO, he handles operations, shipping, and custom order processing, helping each idea make its way from our studio to your collection.",
      "He’s a maker, too, creating 3D designs and ACEO art. A little planning, a little problem-solving, and plenty of imagination go into keeping the creative chaos moving.",
    ],
  },
  megan: {
    role: "ACEO & custom pet artist · Live shows & Grimmfest games",
    bio: [
      "Megan brings a wonderfully extravagant imagination to the studio, from many of our ACEOs to all of our custom pet commissions. Whether she’s capturing a beloved pet or creating a tiny work of art, her pieces make room for big personality.",
      "She also helps keep the live shows moving alongside Jess and dreams up the games we play at Grimmfest. Art, play, and a little friendly mischief are all part of her corner of Moonafique.",
    ],
  },
  keyara: {
    role: "Designer & painter · Grimm World orchestrator",
    bio: [
      "Keyara brings an artist’s eye to everything we dream up at Moonafique. A designer and painter of Grimms and ACEOs, she has a gift for seeing how the colors, characters, and little details can come together.",
      "She orchestrates our Grimm Worlds, turning a collection of tiny pieces into a place with a story to tell. She also photographs our Print Wars pieces alongside Jess, giving those imaginative creations their moment in the spotlight.",
    ],
  },
  eliza: {
    role: "Grimm & ACEO artist · Photography & social media",
    bio: [
      "Eliza gives our little characters plenty of personality, from hand-painted Grimms and ACEOs to the digital paint designs she creates for Grimms before they’re printed. There’s imagination in every stage, from screen to paintbrush.",
      "She’s behind most of our product photography and handles much of our social media posting, helping the latest pieces find their way from the studio to your feed.",
    ],
  },
  ethan: {
    role: "Charcoal ACEO artist",
    bio: [
      "Ethan works a little magic in charcoal. His artistic vision is behind much of Moonafique’s charcoal ACEO art, bringing light, shadow, and texture to art small enough to hold in your hand.",
      "These little works invite a closer look. There’s a whole lot of imagination tucked into those shades of gray.",
    ],
  },
  alex: {
    role: "Photographic ACEO artist",
    bio: [
      "Alex is the eye behind most of the photographic ACEO prints in our shop. With a knack for lighting and positioning, Alex finds the angle that lets a subject shine.",
      "Each frame brings that care to a miniature print, giving collectors a little window into a thoughtfully composed scene.",
    ],
  },
  ruby: {
    role: "3D printing · Grimm builder & ACEO artist",
    bio: [
      "Ruby helps run the 3D print side of Moonafique alongside Jess and Reuben. She designs creations like our fabulous ice cream sets and is our official Grimm builder, assembling the pre-built characters that are ready to join your collection.",
      "Her creativity reaches beyond the print shop, too. Ruby is an ACEO artist and has brought custom artwork commissions to life, another way she turns a little inspiration into something personal.",
    ],
  },
};

export type TeamProject = {
  slug: string;
  title: string;
  occasion: string;
  description: string;
  creators: { slug: TeamSlug; role: string }[];
  photos: CreationPhoto[];
  collectionHref?: string;
  collectionLabel?: string;
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
  collectionLabel: "Explore the Grimm Worlds collection",
};

// Shared credits place one project in each collaborator’s portfolio.
// Keep each person’s portfolio specific to their confirmed work.
export const novemberGrimmOfTheMonth: TeamProject = {
  slug: "november-grimm-of-the-month",
  title: "November Grimm of the Month",
  occasion: "November 2026 · Grimm of the Month",
  description: "Autumn, down to the last patch. Jess’s November design pairs a cream hood and button eyes with an orange coat, sunny boots, and a sunflower surprise on the back.",
  creators: [{ slug: "jess", role: "Design" }],
  photos: novemberGrimmOfTheMonthPhotos,
  collectionHref: "/grimmunity#grimm-of-the-month-2026-11",
  collectionLabel: "Explore the Grimm of the Month collection",
};

export const teamProjects: TeamProject[] = [
  {
    slug: "jess-aceo-art",
    title: "Jess’s ACEO art",
    occasion: "Miniature art, big personality",
    description: "A royal reflection, a woodland wonder, and a dinosaur with a tiny visitor. These three ACEOs by Jess bring playful characters, expressive faces, and plenty of color to a little piece of art.",
    creators: [{ slug: "jess", role: "Artwork" }],
    photos: jessAceoPhotos,
  },
  novemberGrimmOfTheMonth,
  novemberGrimmWorld,
  {
    slug: "rainbow-stars-grimm",
    title: "Eliza’s rainbow & stars Grimm",
    occasion: "Hand-painted custom creation",
    description: "A little night sky in a rainbow coat. Eliza paired a turquoise skull and striped boots with bright stars, colorful trim, and a bold yellow starburst on the back.",
    creators: [{ slug: "eliza", role: "Hand painting" }],
    photos: elizaRainbowStarsPhotos,
  },
  {
    slug: "eliza-hand-painted-grimm",
    title: "Eliza’s hand-painted Grimm",
    occasion: "Custom creation",
    description: "A tiny coat with plenty of character. Eliza’s hand-painted Grimm brings together autumn colors, a patterned coat, and a matching little companion. Turn it around for a closer look at the patchwork.",
    creators: [{ slug: "eliza", role: "Hand painting" }],
    photos: elizaCustomGrimmPhotos,
  },
  {
    slug: "eliza-hand-painted-pet",
    title: "Eliza’s hand-painted pet",
    occasion: "Custom companion",
    description: "Small companion, big personality. Eliza gave this pet bright eyes, a cream chest, and a long, cream-tipped tail to complement her custom Grimm.",
    creators: [{ slug: "eliza", role: "Hand painting" }],
    photos: elizaPetPhotos,
  },
];
