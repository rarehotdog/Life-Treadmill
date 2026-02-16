import type { Quest, UserProfile } from '../../types/app';
import type { TechTreeResponse } from '../../lib/gemini';
import {
  getItemJSON,
  setItemJSON,
  setItemString,
  STORAGE_KEYS,
} from '../../lib/app-storage';
import {
  isSupabaseConfigured,
  saveProfile,
  saveQuestHistory,
  saveQuests,
  saveTechTree,
} from '../../lib/supabase';

export function getTodayString(): string {
  return new Date().toISOString().split('T')[0];
}

export function persistProfile(profile: UserProfile): void {
  setItemJSON(STORAGE_KEYS.profile, profile);

  if (isSupabaseConfigured()) {
    void saveProfile(profile);
  }
}

export function persistCustomizationFlag(value: boolean): void {
  setItemString(STORAGE_KEYS.customized, value ? 'true' : 'false');
}

export function persistTechTree(tree: TechTreeResponse): void {
  setItemJSON(STORAGE_KEYS.techTree, tree);

  if (isSupabaseConfigured()) {
    void saveTechTree(tree);
  }
}

export function persistQuestHistory(quests: Quest[]): void {
  const completedCount = quests.filter((quest) => quest.completed).length;
  const history = {
    completed: completedCount,
    total: quests.length,
  };

  const today = getTodayString();
  const existing =
    getItemJSON<Record<string, { completed: number; total: number }>>(
      STORAGE_KEYS.questHistory,
    ) ?? {};

  existing[today] = history;
  setItemJSON(STORAGE_KEYS.questHistory, existing);

  if (isSupabaseConfigured()) {
    void saveQuestHistory(completedCount, quests.length);
  }
}

export function persistQuests(quests: Quest[]): void {
  setItemJSON(STORAGE_KEYS.quests, quests);
  setItemString(STORAGE_KEYS.questDate, getTodayString());

  if (isSupabaseConfigured()) {
    void saveQuests(quests);
  }
}
