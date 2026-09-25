// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  CredentialCryptoError,
  decryptCredential,
  encryptCredential,
  isCredentialEncryptionConfigured,
  maskCredential,
  maskStoredCredential,
} from "@/server/integrations/credential-crypto";

const PLAINTEXT = "sk-live-abcdefghijkl1234";

beforeEach(() => {
  vi.stubEnv("MODEL_CREDENTIAL_SECRET", "unit-test-credential-secret");
  vi.stubEnv("AUTH_SECRET", "");
  vi.stubEnv("NEXTAUTH_SECRET", "");
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("credential crypto", () => {
  it("round-trips a key without storing the plaintext", () => {
    const stored = encryptCredential(PLAINTEXT);

    expect(stored.startsWith("v1:")).toBe(true);
    expect(stored).not.toContain(PLAINTEXT);
    expect(stored.split(":")).toHaveLength(4);
    expect(decryptCredential(stored)).toBe(PLAINTEXT);
  });

  it("uses a fresh iv so identical keys produce different ciphertext", () => {
    expect(encryptCredential(PLAINTEXT)).not.toBe(encryptCredential(PLAINTEXT));
  });

  it("rejects an empty key", () => {
    expect(() => encryptCredential("   ")).toThrow(CredentialCryptoError);
  });

  it("rejects malformed stored payloads", () => {
    expect(() => decryptCredential("plaintext-key")).toThrow(CredentialCryptoError);
    expect(() => decryptCredential("v2:a:b:c")).toThrow(CredentialCryptoError);
  });

  it("fails to decrypt when the secret changed", () => {
    const stored = encryptCredential(PLAINTEXT);
    vi.stubEnv("MODEL_CREDENTIAL_SECRET", "a-different-secret");

    expect(() => decryptCredential(stored)).toThrow(CredentialCryptoError);
  });

  it("masks all but the last four characters", () => {
    expect(maskCredential(PLAINTEXT)).toBe("********1234");
    expect(maskCredential("abc")).toBe("****");
    expect(maskStoredCredential(encryptCredential(PLAINTEXT))).toBe("********1234");
    expect(maskStoredCredential("not-a-ciphertext")).toBe("****");
  });

  it("reports a missing encryption secret instead of silently degrading", () => {
    vi.stubEnv("MODEL_CREDENTIAL_SECRET", "");

    expect(isCredentialEncryptionConfigured()).toBe(false);
    expect(() => encryptCredential(PLAINTEXT)).toThrow(CredentialCryptoError);
  });
});
