import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createSignupClaim, __resetSignupStoreForTests } from '@/lib/signup-store';
import { getActiveProductionContent } from '@/lib/season-content';
import { CapacityError, getOrganizerSummary, getPublicBoard } from '@/lib/board';

let tempDir = '';

function getLaneRow(laneId: string, rowIndex = 0) {
  const production = getActiveProductionContent();
  const lane = production.lanes.find((item) => item.id === laneId);
  const row = lane?.rows[rowIndex];

  if (!lane || !row) {
    throw new Error(`Missing row ${rowIndex} in lane ${laneId}`);
  }

  return { production, row };
}

describe('activate signup board', () => {
  beforeEach(() => {
    tempDir = mkdtempSync(path.join(os.tmpdir(), 'activate-signup-'));
    __resetSignupStoreForTests(path.join(tempDir, 'test.db'));
  });

  afterEach(() => {
    __resetSignupStoreForTests();
    rmSync(tempDir, { recursive: true, force: true });
  });

  it('calculates grouped row totals from stored claims', async () => {
    const first = getLaneRow('cleanup');
    createSignupClaim({
      productionSlug: first.production.slug,
      slot: first.row,
      input: {
        slotId: first.row.id,
        parentName: 'Morgan Lee',
        phone: '555-000-1111',
        quantity: 2,
      },
    });

    const second = getLaneRow('donations');
    createSignupClaim({
      productionSlug: second.production.slug,
      slot: second.row,
      input: {
        slotId: second.row.id,
        parentName: 'Jamie Brooks',
        phone: '555-222-3333',
        quantity: 1,
      },
    });

    const board = await getPublicBoard();
    const cleanupLane = board.lanes.find((lane) => lane.id === 'cleanup');
    const donationLane = board.lanes.find((lane) => lane.id === 'donations');
    const cleanupRow = cleanupLane?.rows.find((row) => row.id === first.row.id);
    const donationRow = donationLane?.rows.find((row) => row.id === second.row.id);

    expect(cleanupRow?.claimedCount).toBe(2);
    expect(cleanupRow?.remainingCount).toBe(first.row.capacity - 2);
    expect(donationRow?.claimedCount).toBe(1);
    expect(donationRow?.remainingCount).toBe(second.row.capacity - 1);
  });

  it('rejects overbooking when a row is already full', () => {
    const target = getLaneRow('meals');
    createSignupClaim({
      productionSlug: target.production.slug,
      slot: target.row,
      input: {
        slotId: target.row.id,
        parentName: 'First Family',
        phone: '555-000-1111',
        quantity: target.row.capacity,
      },
    });

    expect(() =>
      createSignupClaim({
        productionSlug: target.production.slug,
        slot: target.row,
        input: {
          slotId: target.row.id,
          parentName: 'Second Family',
          phone: '555-000-2222',
          quantity: 1,
        },
      })
    ).toThrow(CapacityError);
  });

  it('builds organizer output grouped by row', async () => {
    const cleanup = getLaneRow('cleanup', 1);
    createSignupClaim({
      productionSlug: cleanup.production.slug,
      slot: cleanup.row,
      input: {
        slotId: cleanup.row.id,
        parentName: 'Taylor Nguyen',
        phone: '555-101-2020',
        quantity: 2,
        notes: 'Can stay a few minutes longer if needed.',
      },
    });

    const summary = await getOrganizerSummary();
    const cleanupLane = summary.lanes.find((lane) => lane.id === 'cleanup');
    const cleanupRow = cleanupLane?.rows.find((row) => row.id === cleanup.row.id);

    expect(summary.totals.people).toBe(2);
    expect(cleanupRow?.claims).toHaveLength(1);
    expect(cleanupRow?.claims[0]?.parentName).toBe('Taylor Nguyen');
  });
});