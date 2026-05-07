import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { POST } from '@/app/api/signups/route';
import { createSignupClaim, __resetSignupStoreForTests } from '@/lib/signup-store';
import { getActiveProductionContent } from '@/lib/season-content';

let tempDir = '';

function getMealSlot() {
  const production = getActiveProductionContent();
  const row = production.lanes[0]?.rows[0];

  if (!row) {
    throw new Error('Missing fixture row.');
  }

  return { production, row };
}

describe('POST /api/signups', () => {
  beforeEach(() => {
    tempDir = mkdtempSync(path.join(os.tmpdir(), 'activate-signup-route-'));
    __resetSignupStoreForTests(path.join(tempDir, 'route-test.db'));
  });

  afterEach(() => {
    __resetSignupStoreForTests();
    rmSync(tempDir, { recursive: true, force: true });
  });

  it('creates a signup and returns an updated board', async () => {
    const { row } = getMealSlot();
    const response = await POST(
      new Request('http://localhost/api/signups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slotId: row.id,
          parentName: 'Casey Torres',
          phone: '555-444-1111',
          quantity: 1,
        }),
      })
    );

    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.claim.parentName).toBe('Casey Torres');
    expect(data.board.lanes[0].rows[0].claimedCount).toBe(1);
  });

  it('rejects requests when the row is already full', async () => {
    const { production, row } = getMealSlot();
    createSignupClaim({
      productionSlug: production.slug,
      slot: row,
      input: {
        slotId: row.id,
        parentName: 'Filled Already',
        phone: '555-444-1111',
        quantity: row.capacity,
      },
    });

    const response = await POST(
      new Request('http://localhost/api/signups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slotId: row.id,
          parentName: 'Too Late',
          phone: '555-444-2222',
          quantity: 1,
        }),
      })
    );

    const data = await response.json();

    expect(response.status).toBe(409);
    expect(data.error).toContain('only has 0');
    expect(data.board.lanes[0].rows[0].isFull).toBe(true);
  });

  it('validates malformed requests', async () => {
    const response = await POST(
      new Request('http://localhost/api/signups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slotId: '',
          parentName: 'A',
          phone: '',
          quantity: 0,
        }),
      })
    );

    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Please check the form and try again.');
  });
});