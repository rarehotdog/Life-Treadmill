export const STORAGE_KEYS = {
  profile: 'ltr_profile',
  quests: 'ltr_quests',
  questDate: 'ltr_questDate',
  techTree: 'ltr_techTree',
  customized: 'ltr_customized',
  energyToday: 'ltr_energyToday',
  energyDate: 'ltr_energyDate',
  futureSelfPrompt: 'ltr_futureSelfPrompt',
  voiceCheckIn: 'ltr_voiceCheckIn',
  failureLog: 'ltr_failureLog',
  questHistory: 'ltr_questHistory',
  userId: 'ltr_userId',
  yearImageLegacy: 'ltr_year_image',
  yearImage: (goalId: string) => `ltr_year_image_${goalId}`,
} as const;

function canUseStorage(): boolean {
  return typeof window !== 'undefined' && !!window.localStorage;
}

export function safeParseJSON<T>(raw: string | null): T | null {
  if (!raw) return null;

  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function getItemString(key: string): string | null {
  if (!canUseStorage()) return null;

  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function setItemString(key: string, value: string): void {
  if (!canUseStorage()) return;

  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Ignore storage write failures.
  }
}

export function getItemJSON<T>(key: string): T | null {
  return safeParseJSON<T>(getItemString(key));
}

export function setItemJSON<T>(key: string, value: T): void {
  setItemString(key, JSON.stringify(value));
}

export function removeItem(key: string): void {
  if (!canUseStorage()) return;

  try {
    window.localStorage.removeItem(key);
  } catch {
    // Ignore storage remove failures.
  }
}

export function getYearImage(goalId: string): string | null {
  const scopedKey = STORAGE_KEYS.yearImage(goalId);
  const scoped = getItemString(scopedKey);
  if (scoped) return scoped;

  const legacy = getItemString(STORAGE_KEYS.yearImageLegacy);
  if (!legacy) return null;

  // One-time migration from legacy key to goal-scoped key.
  setItemString(scopedKey, legacy);
  removeItem(STORAGE_KEYS.yearImageLegacy);
  return legacy;
}
