// Best-effort encryption of secrets at rest in the browser. A single AES-GCM
// key is generated once and kept in IndexedDB as a NON-EXTRACTABLE CryptoKey,
// so the raw key material never leaves the browser and cannot be exported.
//
// NOTE: a browser cannot fully protect secrets — anything the page can decrypt,
// code running in the page can read. This raises the bar (no plaintext at rest)
// but is not a substitute for the OS keychain used by the Tauri build.

import { idbGet, idbSet } from "./idb";

const KEY_ID = "secret-key";

export interface EncryptedBlob {
  iv: string;
  data: string;
}

async function getKey(): Promise<CryptoKey> {
  const existing = await idbGet<CryptoKey>(KEY_ID);
  if (existing) return existing;
  const key = await crypto.subtle.generateKey(
    { name: "AES-GCM", length: 256 },
    false, // non-extractable
    ["encrypt", "decrypt"],
  );
  await idbSet(KEY_ID, key);
  return key;
}

function toBase64(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function fromBase64(value: string): Uint8Array {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

export async function encryptString(plaintext: string): Promise<EncryptedBlob> {
  const key = await getKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(plaintext);
  const buffer = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, encoded);
  return { iv: toBase64(iv), data: toBase64(new Uint8Array(buffer)) };
}

export async function decryptString(blob: EncryptedBlob): Promise<string> {
  const key = await getKey();
  const buffer = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: fromBase64(blob.iv) },
    key,
    fromBase64(blob.data),
  );
  return new TextDecoder().decode(buffer);
}
