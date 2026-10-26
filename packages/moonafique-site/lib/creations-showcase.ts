export type CreationPhoto = {
  src: string;
  alt: string;
  width: number;
  height: number;
  label?: string;
};

export type PrintWarsCreation = {
  id: string;
  month: string;
  title: string;
  description: string;
  theme: 'glow' | 'gold' | 'violet';
  note?: string;
  photos?: CreationPhoto[];
};

// Use photographs of these finished pieces only. Keep the labeled placeholders
// until the owners supply the remaining photos; do not substitute product art.
export const printWarsCreations: PrintWarsCreation[] = [
  {
    id: 'glow-butterfly-battle-bot',
    month: 'August',
    title: 'Glow Butterfly Battle Bot',
    description:
      'A butterfly with a fighting spirit. Our glowing battle bot brought a little unexpected beauty to August’s Print Wars.',
    theme: 'glow',
    photos: [
      {
        src: '/showcase/butterfly-battle-bot-color.jpg',
        alt: 'The Butterfly Battle Bot with bright green and pink details, butterfly decoration, and large boots against a dark background.',
        width: 360,
        height: 438,
        label: 'Color detail',
      },
      {
        src: '/showcase/butterfly-battle-bot-glow.jpg',
        alt: 'The Butterfly Battle Bot in the dark, with its boots, hands, and shoulder details glowing green.',
        width: 360,
        height: 480,
        label: 'In the dark',
      },
    ],
  },
  {
    id: 'archie',
    month: 'August',
    title: 'Archie',
    description:
      'Big blue eyes and a whole lot of personality. Archie made a bonus appearance at August’s Print Wars, outside the contest, and became a crowd favorite.',
    theme: 'violet',
    photos: [
      {
        src: '/showcase/archie-dressed-up.jpg',
        alt: 'Archie, a cheerful cream-colored bird with big blue eyes, wearing a textured hat with a pink plume and a lilac scarf.',
        width: 360,
        height: 480,
        label: 'All dressed up',
      },
      {
        src: '/showcase/archie-without-hat.jpg',
        alt: 'Archie sitting on a garden wall without his hat, with an open beak, blue eyes, and a lilac scarf.',
        width: 360,
        height: 480,
        label: 'Without his hat',
      },
    ],
  },
  {
    id: 'lion-king-diorama',
    month: 'September',
    title: 'The Lion King Diorama',
    description:
      'A beloved world, brought together piece by piece. Created by Moonafique for September’s Print Wars.',
    theme: 'gold',
    photos: [
      {
        src: '/showcase/lion-king-diorama.jpg',
        alt: 'Moonafique’s Lion King diorama with lion cubs on a rock ledge, adult lions, Scar, and hyenas among colorful trees and scenery.',
        width: 1024,
        height: 768,
        label: 'Full diorama',
      },
      {
        src: '/showcase/lion-king-glowing-details.jpg',
        alt: 'A close-up of Scar in the darkened Lion King diorama, with glowing green eyes and bright green and blue scenery.',
        width: 1024,
        height: 768,
        label: 'Glowing details',
      },
    ],
  },
  {
    id: 'devils-favorite-lyre',
    month: 'October',
    title: 'The Devil’s Favorite Lyre',
    description:
      'Sweeping horns, a skull, and strings. A Moonafique creation for October’s Print Wars.',
    theme: 'violet',
    photos: [
      {
        src: '/showcase/IMG_3160.jpeg',
        alt: 'The Devil’s Favorite Lyre, a pale skull-shaped instrument with tall black horns and strings, displayed on a stand.',
        width: 864,
        height: 1536,
        label: 'Finished lyre',
      },
      {
        src: '/showcase/devils-favorite-lyre-glow.jpg',
        alt: 'The Devil’s Favorite Lyre in the dark, with its skull, sweeping horns, and strings illuminated in purple and blue.',
        width: 664,
        height: 1182,
        label: 'Glowing details',
      },
    ],
  },
];

export const customCarpCreation: {
  title: string;
  description: string;
  photo?: CreationPhoto;
} = {
  title: 'An award-winning carp replica',
  description:
    'At 38 inches long with a 30-inch girth, this custom carp replica was a project to remember. We loved bringing it to life.',
  // Add a photo only after the customer grants permission. Keep this feature
  // anonymous: no customer identity, catch location, or identifying image metadata.
};
