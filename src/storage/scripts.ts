import { useSyncExternalStore } from 'react';

import type { Script } from '@/types/script';

import { readRaw, subscribe, writeRaw } from './kv';

function parse(raw: string | undefined): Script[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as Script[]) : [];
  } catch {
    return [];
  }
}

function sortByRecent(scripts: Script[]): Script[] {
  return [...scripts].sort((a, b) => b.updatedAt - a.updatedAt);
}

function readScripts(): Script[] {
  return parse(readRaw());
}

function writeScripts(scripts: Script[]): void {
  writeRaw(JSON.stringify(scripts));
}

function createId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function getScripts(): Script[] {
  return sortByRecent(readScripts());
}

export function getScript(id: string): Script | undefined {
  return readScripts().find((script) => script.id === id);
}

export function createScript(input: { title: string; content: string }): Script {
  const now = Date.now();
  const script: Script = {
    id: createId(),
    title: input.title.trim() || 'Untitled script',
    content: input.content,
    createdAt: now,
    updatedAt: now,
  };
  writeScripts([script, ...readScripts()]);
  return script;
}

export function updateScript(
  id: string,
  patch: { title?: string; content?: string },
): Script | undefined {
  const scripts = readScripts();
  const index = scripts.findIndex((script) => script.id === id);
  if (index === -1) return undefined;

  const next: Script = {
    ...scripts[index],
    updatedAt: Date.now(),
  };
  if (patch.title !== undefined) {
    next.title = patch.title.trim() || 'Untitled script';
  }
  if (patch.content !== undefined) {
    next.content = patch.content;
  }

  scripts[index] = next;
  writeScripts(scripts);
  return next;
}

export function deleteScript(id: string): void {
  writeScripts(readScripts().filter((script) => script.id !== id));
}

// Referentially-stable snapshot so useSyncExternalStore doesn't loop.
let snapshotRaw: string | undefined = readRaw();
let snapshotValue: Script[] = sortByRecent(parse(snapshotRaw));

function getSnapshot(): Script[] {
  const raw = readRaw();
  if (raw !== snapshotRaw) {
    snapshotRaw = raw;
    snapshotValue = sortByRecent(parse(raw));
  }
  return snapshotValue;
}

/** Reactive list of scripts; re-renders on any create/update/delete. */
export function useScripts(): Script[] {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
