import { describe, it, expect, beforeAll } from "vitest";

// Set ENCRYPTION_KEY before importing the module (32 bytes = 256 bits, base64 encoded)
const TEST_KEY = Buffer.alloc(32, "a").toString("base64"); // 32 'a' bytes

describe("encrypt / decrypt", () => {
  let encrypt: (plaintext: string) => string;
  let decrypt: (ciphertext: string) => string;

  beforeAll(async () => {
    process.env.ENCRYPTION_KEY = TEST_KEY;
    const mod = await import("../lib/integrations/encryption");
    encrypt = mod.encrypt;
    decrypt = mod.decrypt;
  });

  it("encrypt returns colon-separated base64 string", () => {
    const ciphertext = encrypt("hello world");
    const parts = ciphertext.split(":");
    expect(parts).toHaveLength(3);
    // Each part should be valid base64
    expect(() => Buffer.from(parts[0], "base64")).not.toThrow();
    expect(() => Buffer.from(parts[1], "base64")).not.toThrow();
    expect(() => Buffer.from(parts[2], "base64")).not.toThrow();
  });

  it("decrypt recovers the original plaintext", () => {
    const original = "super-secret-oauth-token-12345";
    const ciphertext = encrypt(original);
    const decrypted = decrypt(ciphertext);
    expect(decrypted).toBe(original);
  });

  it("encrypt produces different ciphertext each time (random IV)", () => {
    const plaintext = "same-plaintext";
    const c1 = encrypt(plaintext);
    const c2 = encrypt(plaintext);
    expect(c1).not.toBe(c2);
    // But both should decrypt correctly
    expect(decrypt(c1)).toBe(plaintext);
    expect(decrypt(c2)).toBe(plaintext);
  });

  it("decrypting tampered ciphertext throws", () => {
    const ciphertext = encrypt("sensitive-data");
    const [iv, authTag, data] = ciphertext.split(":");
    const tampered = [iv, authTag, data.slice(0, -4) + "XXXX"].join(":");
    expect(() => decrypt(tampered)).toThrow();
  });

  it("handles empty string", () => {
    const ciphertext = encrypt("");
    expect(decrypt(ciphertext)).toBe("");
  });

  it("handles unicode and special characters", () => {
    const special = "OAuth2 token: Bearer eyJ\u{1F510}\u30C6\u30B9\u30C8";
    const ciphertext = encrypt(special);
    expect(decrypt(ciphertext)).toBe(special);
  });
});
