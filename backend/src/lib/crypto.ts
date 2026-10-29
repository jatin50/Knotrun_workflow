import crypto from "node:crypto";

const ALGORITHM = "aes-256-gcm";

function getKey(): Buffer {
  const rawKey = process.env.CREDENTIALS_ENCRYPTION_KEY;
  if (!rawKey) {
    // If not provided, derive a deterministic 32-byte key from JWT_SECRET
    const fallback = process.env.JWT_SECRET || "knotrun-vault-encryption-key-fallback-2026";
    return crypto.createHash("sha256").update(fallback).digest();
  }

  // If exactly 64 hex characters, parse directly as hex buffer
  if (/^[0-9a-fA-F]{64}$/.test(rawKey)) {
    return Buffer.from(rawKey, "hex");
  }

  // If Render auto-generated a random alphanumeric string (generateValue: true),
  // derive a strict 32-byte cryptographic AES-256 key using SHA-256
  return crypto.createHash("sha256").update(rawKey).digest();
}

// Storage format: base64(iv[12 bytes] + authTag[16 bytes] + ciphertext).
// Keeping everything a single opaque string in one DB column keeps the Credential model simple.
export function encrypt(plaintext: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return Buffer.concat([iv, authTag, ciphertext]).toString("base64");
}

export function decrypt(payload: string): string {
  const raw = Buffer.from(payload, "base64");
  const iv = raw.subarray(0, 12);
  const authTag = raw.subarray(12, 28);
  const ciphertext = raw.subarray(28);

  const decipher = crypto.createDecipheriv(ALGORITHM, getKey(), iv);
  decipher.setAuthTag(authTag);
  const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return plaintext.toString("utf8");
}
