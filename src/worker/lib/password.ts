import { ValidationError } from './errors.js';

const ITERATIONS = 100_000;
const SALT_LEN = 16;
const KEY_LEN_BITS = 256;
const MIN_PASSWORD_LEN = 6;

function base64Encode(bytes: Uint8Array): string {
  const bin = Array.from(bytes, (b) => String.fromCharCode(b)).join('');
  return btoa(bin);
}

function base64Decode(str: string): Uint8Array {
  const bin = atob(str);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) {
    out[i] = bin.charCodeAt(i);
  }
  return out;
}

function assertMinLength(password: string) {
  if (password.length < MIN_PASSWORD_LEN) {
    throw new ValidationError(`Password must be at least ${MIN_PASSWORD_LEN} characters`);
  }
}

export async function hashPassword(password: string): Promise<string> {
  assertMinLength(password);

  const salt = crypto.getRandomValues(new Uint8Array(SALT_LEN));
  const key = await deriveKey(password, salt, ITERATIONS);

  return `${ITERATIONS}$${base64Encode(salt)}$${base64Encode(new Uint8Array(key))}`;
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  assertMinLength(password);

  const parts = hash.split('$');
  if (parts.length !== 3) return false;

  const iterations = Number(parts[0]);
  const salt = base64Decode(parts[1]);
  const expected = base64Decode(parts[2]);

  if (
    !Number.isFinite(iterations) ||
    iterations < 1 ||
    salt.length === 0 ||
    expected.length === 0
  ) {
    return false;
  }

  const actual = new Uint8Array(await deriveKey(password, salt, iterations));
  return timingSafeEqual(actual, expected);
}

async function deriveKey(
  password: string,
  salt: Uint8Array,
  iterations: number
): Promise<ArrayBuffer> {
  const encoder = new TextEncoder();
  const material = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveBits']
  );
  return crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations, hash: 'SHA-256' },
    material,
    KEY_LEN_BITS
  );
}

function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a[i] ^ b[i];
  }
  return diff === 0;
}
