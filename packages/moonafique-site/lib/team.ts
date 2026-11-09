import {
  sophiaAceoPhotos,
  meganPetCommissionPhotos,
  meganCustomArtPhotos,
  meganJessDuckPhotos,
  meganJessZebraPhotos,
  reubenAceoPhotos,
  alexDinosaurPhotos,
  keyaraAceoPhotos,
  rubyAceoPhotos,
  jessAceoPhotos,
  novemberGrimmWorldPhotos,
  novemberGrimmOfTheMonthPhotos,
  elizaCustomGrimmPhotos,
  elizaPetPhotos,
  elizaRainbowStarsPhotos,
} from "./project-photos";
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
    role: "Creative vision · Voice of Moonafique",
    bio: [
      "Jess is the life and heart of Moonafique. Our creative visionary pours her imagination, energy, and care into this world, dreaming up the bold designs and unexpected little characters that make it feel like ours. Her love for the work is woven into everything we do.",
      "She brings those ideas to life with her own hands, designing, sculpting, painting, and creating ACEOs full of personality. She also does the planning that gives a big idea a way forward. From an ambitious shop exclusive to the smallest painted detail, Jess puts her heart into the work that makes Moonafique Moonafique.",
      "Jess is the voice of Moonafique, on Whatnot and beyond. Hers is the familiar voice welcoming collectors into our live shows, revealing new creations, and sharing the stories behind the pieces. She brings our personality to the camera, with warmth, imagination, and a little Moonafique mischief. She and Keyara also photograph our Print Wars pieces, capturing the details and imagination behind each one. Jess brings the world to life, then invites you into it.",
    ],
  },
  reuben: {
    role: "Operations & design",
    bio: [
      "Reuben keeps the Moonafique world turning behind the scenes. He handles operations, shipping, and custom order processing, helping each idea make its way from our studio to your collection.",
      "He’s a maker, too, creating 3D designs and ACEO art. A little planning, a little problem-solving, and plenty of imagination go into keeping the creative chaos moving.",
    ],
  },
  megan: {
    role: "Creative partner & artist",
    bio: [
      "Megan, also known as \"My Mom\" is a creator of ACEOs and loves to create combos of 3D creatures and art, bringing pieces to life. There’s a whole lot of Megan magic in this little world.",
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
  sophia: {
    role: "ACEO artist · Event support & creative inspiration",
    bio: [
      "Sophia is Moonafique’s supportive arm, bringing encouragement, imagination, and a helping hand to every event. She helps us bring people together and is a source of creative inspiration for the team. There’s a little Sophia spark in the ideas we dream up together.",
      "She creates ACEOs of her own, giving small pieces of art plenty of personality. Sophia also helps keep us up to date on the content we share, bringing a fresh perspective to what we put out into the world. From our events to your feed, she helps keep the Moonafique magic moving.",
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
    slug: "sophia-aceo-art",
    title: "Sophia’s ACEO art",
    occasion: "Miniature art, big personality",
    description: "A little float among the flowers. Sophia’s platypus pairs a pink belly and paddle tail with blue water, green lily pads, and soft pink blooms for a cheerful pond-side moment.",
    creators: [{ slug: "sophia", role: "Artwork" }],
    photos: sophiaAceoPhotos,
  },
  {
    slug: "megan-pet-commissions",
    title: "Megan’s custom pet portraits",
    occasion: "Custom artwork commissions",
    description: "Familiar faces, captured with a little Moonafique magic. These three commissioned dog portraits by Megan celebrate expressive eyes, fluffy curls, and the details that make each companion their own.",
    creators: [{ slug: "megan", role: "Artwork" }],
    photos: meganPetCommissionPhotos,
  },
  {
    slug: "megan-custom-art",
    title: "Megan’s little worlds",
    occasion: "Custom artwork",
    description: "A sleepy dragon, a shared lantern, and a pair of mushroom companions. Megan’s custom pieces turn small moments into gentle little stories, full of color and woodland whimsy.",
    creators: [{ slug: "megan", role: "Artwork" }],
    photos: meganCustomArtPhotos,
  },
  {
    slug: "reuben-aceo-art",
    title: "Reuben’s ACEO art",
    occasion: "Miniature art, big personality",
    description: "A leafy little companion with a flower reaching for the sky. Reuben pairs bright yellow, fresh greens, and playful purple blooms in a cheerful ACEO full of garden-day charm.",
    creators: [{ slug: "reuben", role: "Artwork" }],
    photos: reubenAceoPhotos,
  },
  {
    slug: "alex-dinosaur-photography",
    title: "Alex’s dinosaur photography",
    occasion: "Small subjects, larger-than-life scenes",
    description: "A tiny dinosaur can make a mighty impression. Alex uses close-up detail, low angles, and outdoor light to give these figures a world of their own, from a toothy encounter in the grass to a towering pose against the sky.",
    creators: [{ slug: "alex", role: "Photography" }],
    photos: alexDinosaurPhotos,
  },
  {
    slug: "keyara-aceo-art",
    title: "Keyara’s ACEO art",
    occasion: "Miniature art, big personality",
    description: "A little doorway with a story waiting on the other side. Keyara fills this ACEO with sweeping curtains, delicate leaves, and colorful details that invite a closer look.",
    creators: [{ slug: "keyara", role: "Artwork" }],
    photos: keyaraAceoPhotos,
  },
  {
    slug: "ruby-aceo-art",
    title: "Ruby’s ACEO art",
    occasion: "Miniature art, big personality",
    description: "A big pink bloom and an even bigger grin. Ruby brings this cheerful little creature to life with bold outlines, leafy greens, and a sunny blue sky.",
    creators: [{ slug: "ruby", role: "Artwork" }],
    photos: rubyAceoPhotos,
  },
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
    slug: "duck-aceo-companion",
    title: "A rainy-day duck collaboration",
    occasion: "ACEO & 3D companion collaboration",
    description: "Some days call for a little duck attitude. Megan created the expressive ACEO shown here, and Jess designed the paint layout for its matching 3D-printed companion. One character, two ways to bring it into your collection.",
    creators: [{ slug: "megan", role: "ACEO artwork" }, { slug: "jess", role: "3D companion paint design" }],
    photos: meganJessDuckPhotos,
  },
  {
    slug: "zebra-aceo-companion",
    title: "A little zebra collaboration",
    occasion: "ACEO & 3D companion collaboration",
    description: "A bright-eyed zebra with a friendly little wave. Megan created the ACEO shown here, while Jess designed the paint layout for the matching 3D-printed companion, carrying that playful personality from the card into a collectible.",
    creators: [{ slug: "megan", role: "ACEO artwork" }, { slug: "jess", role: "3D companion paint design" }],
    photos: meganJessZebraPhotos,
  },
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
