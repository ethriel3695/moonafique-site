import { getActiveProductionContent, getSeasonContent } from '@/lib/season-content';

export async function loadSeasonContent() {
  return getSeasonContent();
}

export async function loadActiveProduction() {
  return getActiveProductionContent();
}