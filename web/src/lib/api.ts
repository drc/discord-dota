import type { MappingConfig } from '../../../src/types.js';

export interface Member {
  id: string;
  username: string;
}

export async function request(url: string, init?: RequestInit): Promise<Response> {
  const res = await fetch(url, init);
  if (!res.ok) {
    throw new Error((await res.text()) || res.statusText);
  }
  return res;
}

export function getSounds(): Promise<string[]> {
  return request('/api/sounds').then((res) => res.json());
}

export async function uploadSound(file: File): Promise<void> {
  const body = new FormData();
  body.append('file', file);
  await request('/api/sounds', { method: 'POST', body });
}

export async function deleteSound(name: string): Promise<void> {
  await request(`/api/sounds/${encodeURIComponent(name)}`, { method: 'DELETE' });
}

export function getMappings(): Promise<MappingConfig> {
  return request('/api/mappings').then((res) => res.json());
}

export async function saveMappings(config: MappingConfig): Promise<void> {
  await request('/api/mappings', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(config),
  });
}

export function getMembers(): Promise<Member[]> {
  return request('/api/discord/members').then((res) => res.json());
}

export function getUserSounds(): Promise<Record<string, string>> {
  return request('/api/discord/user-sounds').then((res) => res.json());
}

export async function setUserSound(userId: string, sound: string): Promise<void> {
  await request(`/api/discord/user-sounds/${encodeURIComponent(userId)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sound }),
  });
}

export async function deleteUserSound(userId: string): Promise<void> {
  await request(`/api/discord/user-sounds/${encodeURIComponent(userId)}`, { method: 'DELETE' });
}

export async function playInVoice(name: string): Promise<void> {
  await request(`/api/sounds/${encodeURIComponent(name)}/play`, { method: 'POST' });
}
