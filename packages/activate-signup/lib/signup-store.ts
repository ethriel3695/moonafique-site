import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import {
  storedSignupClaimSchema,
  type SignupClaimInput,
  type SignupRowConfig,
  type StoredSignupClaim,
} from '@/lib/schema';

type SignupStoreData = {
  claims: StoredSignupClaim[];
};

export class CapacityError extends Error {}

let testDatabasePath: string | undefined;

function resolveDatabasePath() {
  if (testDatabasePath) {
    return testDatabasePath;
  }

  const configuredPath = process.env.ACTIVATE_SIGNUP_DB_PATH;

  if (configuredPath) {
    return path.isAbsolute(configuredPath)
      ? configuredPath
      : path.join(process.cwd(), configuredPath);
  }

  return path.join(process.cwd(), '.data', 'activate-signup.json');
}

function getStorePath() {
  const databasePath = resolveDatabasePath();
  mkdirSync(path.dirname(databasePath), { recursive: true });

  return databasePath;
}

function readStore(): SignupStoreData {
  const storePath = getStorePath();

  if (!existsSync(storePath)) {
    return { claims: [] };
  }

  const contents = readFileSync(storePath, 'utf8');

  if (!contents.trim()) {
    return { claims: [] };
  }

  const parsed = JSON.parse(contents) as SignupStoreData;

  return {
    claims: parsed.claims.map((claim) => storedSignupClaimSchema.parse(claim)),
  };
}

function writeStore(data: SignupStoreData) {
  writeFileSync(getStorePath(), JSON.stringify(data, null, 2));
}

export function createSignupClaim(args: {
  productionSlug: string;
  slot: SignupRowConfig;
  input: SignupClaimInput;
}) {
  const { productionSlug, slot, input } = args;
  const store = readStore();
  const claimedCount = store.claims
    .filter(
      (claim) =>
        claim.productionSlug === productionSlug && claim.slotId === input.slotId
    )
    .reduce((total, claim) => total + claim.quantity, 0);

  const nextClaimedCount = claimedCount + input.quantity;

  if (nextClaimedCount > slot.capacity) {
    throw new CapacityError(
      `${slot.title} only has ${slot.capacity - claimedCount} ${slot.unitLabel} left.`
    );
  }

  const claim = storedSignupClaimSchema.parse({
    id: crypto.randomUUID(),
    productionSlug,
    slotId: input.slotId,
    category: slot.category,
    parentName: input.parentName,
    phone: input.phone,
    email: input.email,
    quantity: input.quantity,
    notes: input.notes,
    createdAt: new Date().toISOString(),
  });

  store.claims.push(claim);
  writeStore(store);

  return claim;
}

export function listSignupClaims(productionSlug: string) {
  return readStore().claims
    .filter((claim) => claim.productionSlug === productionSlug)
    .sort((left, right) => left.createdAt.localeCompare(right.createdAt));
}

export function listClaimTotals(productionSlug: string) {
  const totals = new Map<string, number>();

  for (const claim of readStore().claims) {
    if (claim.productionSlug !== productionSlug) {
      continue;
    }

    totals.set(claim.slotId, (totals.get(claim.slotId) ?? 0) + claim.quantity);
  }

  return totals;
}

export function __resetSignupStoreForTests(databasePath?: string) {
  testDatabasePath = databasePath;

  if (databasePath) {
    rmSync(databasePath, { force: true });
  }
}