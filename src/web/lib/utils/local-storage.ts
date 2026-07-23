import { z } from 'zod';

export function getItem<T>(key: string): T | null;
export function getItem<T>(key: string, schema: z.ZodType<T>): T | null;
export function getItem<T>(key: string, schema?: z.ZodType<T>): T | null {
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(key) : null;
    if (raw === null) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (schema) {
      return schema.parse(parsed);
    }
    return parsed as T;
  } catch {
    return null;
  }
}

export function setItem<T>(key: string, value: T): boolean {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(key, JSON.stringify(value));
    }
    return true;
  } catch {
    return false;
  }
}

export function removeItem(key: string): void {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(key);
    }
  } catch {
    // ignore
  }
}
