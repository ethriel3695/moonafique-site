import {
  signupClaimInputSchema,
  publicBoardSchema,
  organizerSummarySchema,
  type OrganizerSummary,
  type PublicBoard,
  type PublicBoardRow,
  type ProductionConfig,
  type SignupClaimInput,
  type SignupRowConfig,
} from '@/lib/schema';
import { loadActiveProduction } from '@/lib/content-loader';
import {
  CapacityError,
  createSignupClaim,
  listClaimTotals,
  listSignupClaims,
} from '@/lib/signup-store';

export class SlotNotFoundError extends Error {}

function findSlot(production: ProductionConfig, slotId: string): SignupRowConfig | null {
  for (const lane of production.lanes) {
    const row = lane.rows.find((item) => item.id === slotId);
    if (row) {
      return row;
    }
  }

  return null;
}

function buildBoard(production: ProductionConfig): PublicBoard {
  const totals = listClaimTotals(production.slug);

  return publicBoardSchema.parse({
    production: {
      id: production.id,
      slug: production.slug,
      title: production.title,
      seasonLabel: production.seasonLabel,
      venue: production.venue,
      blurb: production.blurb,
      coverageNote: production.coverageNote,
      organizerSummary: production.organizerSummary,
    },
    lanes: production.lanes.map((lane) => ({
      ...lane,
      rows: lane.rows.map((row) => {
        const claimedCount = totals.get(row.id) ?? 0;
        return {
          ...row,
          claimedCount,
          remainingCount: Math.max(row.capacity - claimedCount, 0),
          isFull: claimedCount >= row.capacity,
        } satisfies PublicBoardRow;
      }),
    })),
    updatedAt: new Date().toISOString(),
  });
}

export async function getPublicBoard() {
  const production = await loadActiveProduction();
  return buildBoard(production);
}

export async function submitSignupClaim(rawInput: SignupClaimInput) {
  const input = signupClaimInputSchema.parse(rawInput);
  const production = await loadActiveProduction();
  const slot = findSlot(production, input.slotId);

  if (!slot) {
    throw new SlotNotFoundError('That signup row no longer exists.');
  }

  const claim = createSignupClaim({
    productionSlug: production.slug,
    slot,
    input,
  });

  return {
    claim,
    board: buildBoard(production),
  };
}

export async function getOrganizerSummary() {
  const production = await loadActiveProduction();
  const board = buildBoard(production);
  const claims = listSignupClaims(production.slug);
  const claimsBySlot = new Map<string, typeof claims>();

  for (const claim of claims) {
    const slotClaims = claimsBySlot.get(claim.slotId) ?? [];
    slotClaims.push(claim);
    claimsBySlot.set(claim.slotId, slotClaims);
  }

  const summary: OrganizerSummary = organizerSummarySchema.parse({
    production: board.production,
    lanes: board.lanes.map((lane) => ({
      ...lane,
      rows: lane.rows.map((row) => ({
        ...row,
        claims: claimsBySlot.get(row.id) ?? [],
      })),
    })),
    totals: {
      claims: claims.length,
      people: claims.reduce((total, claim) => total + claim.quantity, 0),
    },
    updatedAt: new Date().toISOString(),
  });

  return summary;
}

export function isValidOrganizerToken(token: string | null) {
  const expectedToken = process.env.ACTIVATE_ORGANIZER_TOKEN;

  if (!expectedToken) {
    return process.env.NODE_ENV === 'development' && token === 'local-preview';
  }

  return token === expectedToken;
}

function escapeCsv(value: string | number | undefined) {
  const stringValue = String(value ?? '');
  return `"${stringValue.replaceAll('"', '""')}"`;
}

export async function getOrganizerCsv() {
  const summary = await getOrganizerSummary();
  const lines = [
    ['Lane', 'Row', 'Claimed', 'Capacity', 'Parent', 'Phone', 'Email', 'Quantity', 'Notes', 'Created at']
      .map(escapeCsv)
      .join(','),
  ];

  for (const lane of summary.lanes) {
    for (const row of lane.rows) {
      if (row.claims.length === 0) {
        lines.push(
          [
            lane.title,
            row.title,
            row.claimedCount,
            row.capacity,
            '',
            '',
            '',
            '',
            '',
            '',
          ]
            .map(escapeCsv)
            .join(',')
        );
        continue;
      }

      for (const claim of row.claims) {
        lines.push(
          [
            lane.title,
            row.title,
            row.claimedCount,
            row.capacity,
            claim.parentName,
            claim.phone,
            claim.email,
            claim.quantity,
            claim.notes,
            claim.createdAt,
          ]
            .map(escapeCsv)
            .join(',')
        );
      }
    }
  }

  return lines.join('\n');
}

export { CapacityError };