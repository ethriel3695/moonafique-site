export type GrimShowcaseEdition = {
  month: string;
  monthNumber: string;
  year: number;
  status: "vaulted" | "available";
  remaining: number;
  image?: {
    src: string;
    alt: string;
    width: number;
    height: number;
    crop?: { x: number; y: number; width: number; height: number };
  };
};

export const grimWhatnotUrl = "https://www.whatnot.com/user/moonafique";
// Owner-provided availability. Update this date and count together after a Whatnot sale.
export const grimShowcaseUpdated = { date: "2026-10-24", label: "October 24, 2026" };

// Display separate frames from the owner's original group photo. These coordinates
// crop only the view; the photograph and painted details remain unchanged.
const groupPhoto = { src: "/showcase/grim-of-the-month-august-september-october.jpg", width: 664, height: 1182 };

export const grimShowcaseEditions: GrimShowcaseEdition[] = [
  {
    month: "August", monthNumber: "08", year: 2026, status: "vaulted", remaining: 0,
    image: {
      ...groupPhoto,
      alt: "August Grim of the Month in mint green and lilac, holding its rabbit mermaid pet.",
      crop: { x: 28, y: 535, width: 216, height: 630 },
    },
  },
  {
    month: "September", monthNumber: "09", year: 2026, status: "vaulted", remaining: 0,
    image: {
      ...groupPhoto,
      alt: "September Grim of the Month with a blue hood and bright green boots, holding its yellow and orange cat pet.",
      crop: { x: 242, y: 535, width: 202, height: 630 },
    },
  },
  {
    month: "October", monthNumber: "10", year: 2026, status: "available", remaining: 2,
    image: {
      ...groupPhoto,
      alt: "October Grim of the Month in witchy purple and gold, holding its blue and green articulated cat pet.",
      crop: { x: 433, y: 535, width: 222, height: 630 },
    },
  },
];
