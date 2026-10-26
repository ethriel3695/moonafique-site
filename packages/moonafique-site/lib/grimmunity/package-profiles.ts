// Public package measurements, shared by shipping and presentation examples.
// Return addresses and credentials belong in the server-only shipping module.
export const grimmParcel = {
  length: 8,
  width: 8,
  height: 8,
  weight: 8,
} as const;
// Quote the high end of the owner-confirmed 3–6 oz range.
export const aceoParcel = {
  length: 7,
  width: 5,
  height: 1,
  weight: 6,
} as const;
