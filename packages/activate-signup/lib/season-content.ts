import { seasonConfigSchema, type ProductionConfig } from '@/lib/schema';

const seasonContent = seasonConfigSchema.parse({
  id: '2026-spring',
  title: 'Activate 2026 Spring Season',
  activeProductionSlug: 'charlie-and-the-chocolate-factory',
  productions: [
    {
      id: 'production-charlie',
      slug: 'charlie-and-the-chocolate-factory',
      title: 'Charlie and the Chocolate Factory',
      seasonLabel: 'May 2026 volunteer board',
      venue: 'Activate Community Theatre',
      blurb:
        'Families keep this production running. Pick a meal, cleanup block, concessions shift, or donation item and claim only the spots you can cover.',
      coverageNote:
        'Rows update live after each signup so leads can see what still needs coverage.',
      organizerSummary:
        'Use the secret organizer link to review grouped claims and export a simple CSV.',
      lanes: [
        {
          id: 'meals',
          title: 'Cast and Crew Meals',
          shortTitle: 'Meals',
          description:
            'Hot dinner or a ready-to-serve meal for the rehearsal and show day rush.',
          emphasis: 'Rose lane',
          rows: [
            {
              id: 'meal-2026-05-12',
              category: 'meals',
              type: 'meal',
              title: 'Tech rehearsal dinner',
              summary: 'Tuesday, May 12 for 12 students and crew.',
              details: ['Dropoff by 5:15 PM', 'Disposable serving utensils help'],
              dateLabel: 'Tue, May 12',
              capacity: 1,
              unitLabel: 'meal host',
              noteHint: 'Share the meal plan or dietary notes if useful.',
            },
            {
              id: 'meal-2026-05-14',
              category: 'meals',
              type: 'meal',
              title: 'Dress rehearsal dinner',
              summary: 'Thursday, May 14 for 14 students and crew.',
              details: ['Dropoff by 5:15 PM', 'Please include napkins'],
              dateLabel: 'Thu, May 14',
              capacity: 1,
              unitLabel: 'meal host',
              noteHint: 'Let us know what you are bringing.',
            },
            {
              id: 'meal-2026-05-16',
              category: 'meals',
              type: 'meal',
              title: 'Saturday matinee lunch',
              summary: 'Saturday, May 16 for 10 students between shows.',
              details: ['Easy-to-serve items only', 'Nut-aware choices preferred'],
              dateLabel: 'Sat, May 16',
              capacity: 1,
              unitLabel: 'meal host',
              noteHint: 'Let us know whether this is lunch or snack-style.',
            },
          ],
        },
        {
          id: 'cleanup',
          title: 'Cleanup Crew',
          shortTitle: 'Cleanup',
          description:
            'Reset the lobby, collect trash, and help us leave the space quickly after each performance.',
          emphasis: 'Gold lane',
          rows: [
            {
              id: 'cleanup-2026-05-15',
              category: 'cleanup',
              type: 'volunteer',
              title: 'Friday cleanup team',
              summary: 'Friday, May 15 after curtain.',
              details: ['10:00 PM to 10:30 PM', 'Light sweeping and reset'],
              dateLabel: 'Fri, May 15',
              capacity: 3,
              unitLabel: 'spots',
            },
            {
              id: 'cleanup-2026-05-16',
              category: 'cleanup',
              type: 'volunteer',
              title: 'Saturday cleanup team',
              summary: 'Saturday, May 16 after the evening performance.',
              details: ['10:00 PM to 10:30 PM', 'Great for two adults and a teen'],
              dateLabel: 'Sat, May 16',
              capacity: 4,
              unitLabel: 'spots',
            },
          ],
        },
        {
          id: 'concessions',
          title: 'Concessions Help',
          shortTitle: 'Concessions',
          description:
            'Cover the stand before house opens and at intermission.',
          emphasis: 'Sea lane',
          rows: [
            {
              id: 'concessions-2026-05-15',
              category: 'concessions',
              type: 'volunteer',
              title: 'Opening night concessions',
              summary: 'Friday, May 15 from 6:15 PM to intermission.',
              details: ['Cashbox and Square setup provided', 'Two adults preferred'],
              dateLabel: 'Fri, May 15',
              capacity: 2,
              unitLabel: 'spots',
            },
            {
              id: 'concessions-2026-05-16',
              category: 'concessions',
              type: 'volunteer',
              title: 'Saturday matinee concessions',
              summary: 'Saturday, May 16 from 12:30 PM to intermission.',
              details: ['One adult and one teen works great', 'Arrive 30 minutes early'],
              dateLabel: 'Sat, May 16',
              capacity: 2,
              unitLabel: 'spots',
            },
          ],
        },
        {
          id: 'donations',
          title: 'Concessions Donations',
          shortTitle: 'Donations',
          description:
            'Bring the items we need to keep the stand stocked all weekend.',
          emphasis: 'Sky lane',
          rows: [
            {
              id: 'donation-cookies',
              category: 'donations',
              type: 'donation',
              title: 'Packaged cookies',
              summary: '12 individually wrapped cookies or bars.',
              details: ['Store-bought only', 'Drop off by Friday call time'],
              capacity: 2,
              unitLabel: 'donations',
              noteHint: 'Tell us the brand or flavor if you know it.',
            },
            {
              id: 'donation-water',
              category: 'donations',
              type: 'donation',
              title: 'Case of bottled water',
              summary: 'One 24-pack for the concessions table.',
              details: ['Any standard bottled water brand'],
              capacity: 2,
              unitLabel: 'cases',
            },
            {
              id: 'donation-candy',
              category: 'donations',
              type: 'donation',
              title: 'Grab-and-go candy',
              summary: 'One box of theater-style candy or gum.',
              details: ['No homemade food for this row'],
              capacity: 4,
              unitLabel: 'boxes',
            },
          ],
        },
      ],
    },
  ],
});

export function getSeasonContent() {
  return seasonContent;
}

export function getActiveProductionContent(): ProductionConfig {
  const production = seasonContent.productions.find(
    (item) => item.slug === seasonContent.activeProductionSlug
  );

  if (!production) {
    throw new Error('Active Activate production config was not found.');
  }

  return production;
}