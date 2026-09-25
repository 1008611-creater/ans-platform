import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

/**
 * 用户自带模型 Key（BYOK）的加解密。
 *
 * - AES-256-GCM，密钥由 MODEL_CREDENTIAL_SECRET 派生，明文绝不落库。
 * - 存储格式 `v1:iv:authTag:ciphertext`，便于后续轮换算法版本。
 * - 明文只允许存在于服务端内存；任何 API 响应只返回掩码后的后四位。
 */

const PREFIX = "v1";
const ALGORITHM = "aes-256-gcm";
const IV_BYTES = 12;

export class CredentialCryptoError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CredentialCryptoError";
  }
}

function secretMaterial(): Buffer {
  const secret =
    process.env.MODEL_CREDENTIAL_SECRET?.trim() ||
    process.env.AUTH_SECRET?.trim() ||
    process.env.NEXTAUTH_SECRET?.trim() ||
    "";
  if (!secret) {
    throw new CredentialCryptoError("缺少模型凭证加密密钥（MODEL_CREDENTIAL_SECRET）。");
  }
  return createHash("sha256").update(`ans:model-credential:${secret}`).digest();
}

export function isCredentialEncryptionConfigured(): boolean {
  try {
    secretMaterial();
    return true;
  } catch {
    return false;
  }
}

export function encryptCredential(plaintext: string): string {
  if (!plaintext.trim()) throw new CredentialCryptoError("模型 Key 不能为空。");
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGORITHM, secretMaterial(), iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [PREFIX, iv.toString("hex"), tag.toString("hex"), ciphertext.toString("base64")].join(":");
}

export function decryptCredential(stored: string): string {
  const parts = stored.split(":");
  if (parts.length !== 4 || parts[0] !== PREFIX) {
    throw new CredentialCryptoError("模型凭证格式无效，请重新绑定。");
  }
  const ivHex = parts[1];
  const tagHex = parts[2];
  const payload = parts[3];
  try {
    const decipher = createDecipheriv(ALGORITHM, secretMaterial(), Buffer.from(ivHex, "hex"));
    decipher.setAuthTag(Buffer.from(tagHex, "hex"));
    return Buffer.concat([decipher.update(Buffer.from(payload, "base64")), decipher.final()]).toString("utf8");
  } catch {
    throw new CredentialCryptoError("模型凭证无法解密，请重新绑定。");
  }
}

/** 只保留后四位，用于列表展示。 */
export function maskCredential(plaintext: string): string {
  const trimmed = plaintext.trim();
  if (trimmed.length <= 4) return "****";
  return `${"*".repeat(Math.min(8, trimmed.length - 4))}${trimmed.slice(-4)}`;
}

/** 从密文推导掩码，避免为了展示而解密；解密失败时退化为全掩码。 */
export function maskStoredCredential(stored: string): string {
  try {
    return maskCredential(decryptCredential(stored));
  } catch {
    return "****";
  }
}
