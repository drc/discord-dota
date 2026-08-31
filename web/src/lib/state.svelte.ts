import type { MappingConfig, MappingEntry } from '../../../src/types.js';
import { getMappings, getMembers, getSounds, getUserSounds, type Member } from './api.js';

export const app = $state({
  sounds: [] as string[],
  mappings: null as MappingConfig | null,
  original: null as MappingConfig | null,
  userSounds: {} as Record<string, string>,
  members: [] as Member[],
});

export async function loadSounds(): Promise<void> {
  app.sounds = await getSounds();
}

export async function loadMembers(): Promise<void> {
  try {
    app.members = await getMembers();
  } catch (error) {
    console.error('Failed to load members', error);
  }
}

export async function loadUserSounds(): Promise<void> {
  app.userSounds = await getUserSounds();
}

export async function loadAll(): Promise<void> {
  app.mappings = await getMappings();
  app.original = $state.snapshot(app.mappings);
  await Promise.all([loadSounds(), loadMembers()]);
  await loadUserSounds();
}

export function isDirty(): boolean {
  return JSON.stringify(app.mappings) !== JSON.stringify(app.original);
}

export function hasBrokenMappings(): boolean {
  if (!app.mappings) {
    return false;
  }
  return Object.values(app.mappings.dota)
    .flat()
    .some((m) => !app.sounds.includes(m.sound));
}

export function isSoundBroken(sound: string): boolean {
  return !app.sounds.includes(sound);
}

export function parseValue(val: string): number | string | boolean | undefined {
  if (val === '') {
    return undefined;
  }
  if (val === 'true') {
    return true;
  }
  if (val === 'false') {
    return false;
  }
  const num = Number(val);
  if (!isNaN(num)) {
    return num;
  }
  return String(val);
}

export const CONDITIONS: { value: MappingEntry['condition']; label: string }[] = [
  { value: '>', label: '>' },
  { value: '<', label: '<' },
  { value: '===', label: '=' },
  { value: '!==', label: '!=' },
  { value: '*', label: '*' },
  { value: '%', label: '%' },
];

export function updateMapping(
  event: string,
  idx: number,
  key: 'sound' | 'condition' | 'value' | 'suppress',
  val: string | boolean,
): void {
  const { mappings } = app,
    entry = mappings?.dota[event]?.[idx];
  if (!mappings || !entry) {
    return;
  }
  if (key === 'value') {
    const parsed = parseValue(String(val));
    if (parsed === undefined) {
      delete (entry as Partial<MappingEntry>).value;
    } else {
      entry.value = parsed;
    }
  } else if (key === 'suppress') {
    entry.suppress = Boolean(val);
  } else if (key === 'condition') {
    entry.condition = String(val) as MappingEntry['condition'];
  } else {
    entry.sound = String(val);
  }
}

export function addMapping(
  event: string,
  sound: string,
  condition: MappingEntry['condition'],
  rawValue: string,
  suppress: boolean,
): void {
  const { mappings } = app;
  if (!mappings) {
    return;
  }
  if (!mappings.dota[event]) {
    mappings.dota[event] = [];
  }
  const entry: MappingEntry = { sound, condition, value: '', suppress },
    parsed = condition === '*' ? undefined : parseValue(rawValue);
  if (parsed === undefined) {
    delete (entry as Partial<MappingEntry>).value;
  } else {
    entry.value = parsed;
  }
  mappings.dota[event].unshift(entry);
}

export function removeMapping(event: string, idx: number): void {
  const { mappings } = app,
    arr = mappings?.dota[event];
  if (!mappings || !arr) {
    return;
  }
  arr.splice(idx, 1);
  if (arr.length === 0) {
    delete mappings.dota[event];
  }
}

export function moveMapping(event: string, idx: number, dir: -1 | 1): void {
  const { mappings } = app,
    arr = mappings?.dota[event];
  if (!mappings || !arr) {
    return;
  }
  const target = idx + dir;
  if (target < 0 || target >= arr.length) {
    return;
  }
  [arr[idx], arr[target]] = [arr[target], arr[idx]];
}
