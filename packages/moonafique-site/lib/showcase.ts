export type ShowcaseFeature = {
  id: string;
  category: string;
  title: string;
  description: string;
  detail: string;
  missingImage: string;
  images?: {
    src: string;
    alt: string;
    width: number;
    height: number;
    label?: string;
  }[];
  imageCaption?: string;
};

// Add only confirmed project media. Missing images stay visible in local draft
// mode; the public section includes only features with an approved image.
export const showcaseFeatures: ShowcaseFeature[] = [
  {
    id: 'devils-favorite-lyre',
    category: 'A quiet kind of music',
    title: "The Devil’s Favorite Lyre",
    description:
      'A horned skull silhouette and a surprisingly quiet voice. This finished lyre brings a little of Moonafique’s mischief to music.',
    detail: 'Finished piece · plays quietly',
    missingImage: 'A photograph of the finished horned skull lyre',
    images: [{
      src: '/showcase/IMG_3160.jpeg',
      alt: 'The Devil’s Favorite Lyre: a skull-shaped instrument with tall curved horns and strings, displayed on a stand.',
      width: 864,
      height: 1536,
    }],
    imageCaption: 'Photograph of the finished lyre',
  },
  {
    id: 'grimfest',
    category: 'A world to get lost in',
    title: 'The four houses of Grimfest',
    description:
      'Meet Marrowick, Hollowsmere, Veradell, and Glimmerfell. Four names at the heart of Grimfest, with room for a whole world of stories.',
    detail: 'Marrowick · Hollowsmere · Veradell · Glimmerfell',
    missingImage: 'The four approved Grimfest house crests',
    images: [
      {
        src: '/showcase/Marrowick_Crest.png',
        alt: 'Marrowick crest artwork: a cream spiral with root-like shapes inside a red circle.',
        width: 1200,
        height: 1200,
        label: 'Marrowick',
      },
      {
        src: '/showcase/Hollowsmere_Crest.png',
        alt: 'Hollowsmere crest artwork: a corked bottle holding blue waves and a pearl inside a blue circle.',
        width: 1200,
        height: 1200,
        label: 'Hollowsmere',
      },
      {
        src: '/showcase/Veradell_Crest.png',
        alt: 'Veradell crest artwork: a crescent moon above two curls and a star inside a green circle.',
        width: 1200,
        height: 1200,
        label: 'Veradell',
      },
      {
        src: '/showcase/Glimmerfell_Crest.png',
        alt: 'Glimmerfell crest artwork: an open arched door, three stars, and stepping stones inside a purple circle.',
        width: 1200,
        height: 1200,
        label: 'Glimmerfell',
      },
    ],
    imageCaption: 'Grimfest house crests · digital artwork',
  },
  {
    id: 'aceo-original-art',
    category: 'Original art, up close',
    title: 'Art that fits in your hand',
    description:
      'Small enough to hold in one hand, with plenty to look at. Our original ACEOs measure just 2.5 by 3.5 inches—a little space for a closer look.',
    detail: 'ACEO · 2.5 × 3.5 inches',
    missingImage: 'A photograph or scan of the original ACEO collection',
    images: [{
      src: '/showcase/IMG_0906.jpeg',
      alt: 'Original painted ACEO card with a colorful long-necked dinosaur, purple spines, and jeweled spots on a blue-green background.',
      width: 1152,
      height: 1536,
    }],
    imageCaption: 'Original ACEO art',
  },
];
