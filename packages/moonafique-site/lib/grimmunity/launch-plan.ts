// Owner-approved launch targets. Final copy approval and paid enrollment are separate controls.
export const launchPlan = {
  // Legacy shared-cap fields remain for reading old edition allocations.
  memberCap: 24,
  retainedCopies: 1,
  firstShipmentMonth: "2026-11",
  firstShipmentLabel: "November 2026",
  enrollmentStartLabel: "November 1, 2026",
  firstShipmentLeadDays: 7,
} as const;
