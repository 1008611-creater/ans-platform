import { z } from "zod";
import { db } from "@/lib/db";
import { getRunModel } from "@/lib/run-models";
import {
  CredentialCryptoError,
  encryptCredential,
  isCredentialEncryptionConfigured,
  maskCredential,
  maskStoredCredential,
} from "@/server/integrations/credential-crypto";

/**
 * 用户自带模型 Key（BYOK）。
 *
 * 明文 Key 只在写入时经过一次加密，之后任何读取路径都只返回掩码，
 * 唯一能拿到明文的位置是服务端执行工作流时的解密调用。
 */

export class CredentialServiceError extends Error {
  constructor(
    message: string,
    public readonly code = "CREDENTIAL_ERROR",
    public readonly status = 400,
  ) {
    super(message);
    this.name = "CredentialServiceError";
  }
}

const MAX_CREDENTIALS_PER_USER = 5;

const baseUrlSchema = z
  .string()
  .trim()
  .max(300)
  .refine((value) => {
    try {
      const url = new URL(value);
      return url.protocol === "https:" || url.protocol === "http:";
    } catch {
      return false;
    }
  }, "接口地址必须是 http(s) 开头的合法 URL");

const createSchema = z
  .object({
    label: z.string().trim().min(1).max(40),
    baseUrl: baseUrlSchema,
    apiKey: z.string().trim().min(8).max(400),
  })
  .strict();

const updateSchema = z
  .object({
    label: z.string().trim().min(1).max(40).optional(),
    active: z.boolean().optional(),
  })
  .strict();

function publicShape(credential: {
  id: string;
  label: string;
  baseUrl: string;
  encryptedKey: string;
  keyLast4: string;
  active: boolean;
  createdAt: Date;
}) {
  return {
    id: credential.id,
    label: credential.label,
    baseUrl: credential.baseUrl,
    keyMasked: maskStoredCredential(credential.encryptedKey),
    keyLast4: credential.keyLast4,
    active: credential.active,
    createdAt: credential.createdAt,
  };
}

export async function listCredentials(userId: string) {
  const credentials = await db.userModelCredential.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: MAX_CREDENTIALS_PER_USER,
  });
  return credentials.map(publicShape);
}

export async function createCredential(userId: string, input: unknown) {
  const parsed = createSchema.safeParse(input);
  if (!parsed.success) {
    throw new CredentialServiceError(
      parsed.error.issues[0]?.message ?? "请填写名称、接口地址和 API Key。",
      "INVALID_INPUT",
    );
  }
  if (!isCredentialEncryptionConfigured()) {
    throw new CredentialServiceError(
      "服务端尚未配置模型凭证加密密钥，暂时无法绑定自带 Key。",
      "CRYPTO_NOT_CONFIGURED",
      503,
    );
  }
  const existing = await db.userModelCredential.count({ where: { userId } });
  if (existing >= MAX_CREDENTIALS_PER_USER) {
    throw new CredentialServiceError(`最多绑定 ${MAX_CREDENTIALS_PER_USER} 个模型凭证。`, "TOO_MANY_CREDENTIALS", 409);
  }
  try {
    const credential = await db.userModelCredential.create({
      data: {
        userId,
        label: parsed.data.label,
        baseUrl: parsed.data.baseUrl,
        encryptedKey: encryptCredential(parsed.data.apiKey),
        keyLast4: parsed.data.apiKey.slice(-4),
      },
    });
    return publicShape(credential);
  } catch (error) {
    if (error instanceof CredentialCryptoError) {
      throw new CredentialServiceError(error.message, "CRYPTO_NOT_CONFIGURED", 503);
    }
    if (error instanceof Error && error.message.toLowerCase().includes("unique")) {
      throw new CredentialServiceError("已存在同名凭证，请更换名称。", "LABEL_EXISTS", 409);
    }
    throw error;
  }
}

export async function updateCredential(userId: string, id: string, input: unknown) {
  const parsed = updateSchema.safeParse(input);
  if (!parsed.success) throw new CredentialServiceError("请检查提交的字段。", "INVALID_INPUT");
  const updated = await db.userModelCredential.updateMany({
    where: { id, userId },
    data: {
      ...(parsed.data.label === undefined ? {} : { label: parsed.data.label }),
      ...(parsed.data.active === undefined ? {} : { active: parsed.data.active }),
    },
  });
  if (updated.count !== 1) throw new CredentialServiceError("凭证不存在。", "NOT_FOUND", 404);
  const credential = await db.userModelCredential.findUniqueOrThrow({ where: { id } });
  return publicShape(credential);
}

export async function deleteCredential(userId: string, id: string) {
  const deleted = await db.userModelCredential.deleteMany({ where: { id, userId } });
  if (deleted.count !== 1) throw new CredentialServiceError("凭证不存在。", "NOT_FOUND", 404);
  return { id };
}

/**
 * 执行期解析：返回可直接用于模型调用的明文凭据。
 * 只在服务端调用，调用方不得把返回值写入响应或日志。
 */
/** 校验凭证归属与可用性，不触碰明文。 */
export async function loadOwnedCredential(userId: string, credentialId: string) {
  const credential = await db.userModelCredential.findFirst({
    where: { id: credentialId, userId, active: true },
  });
  if (!credential) {
    throw new CredentialServiceError("自带 Key 不存在或已停用。", "CREDENTIAL_UNAVAILABLE", 404);
  }
  return credential;
}

export async function resolveCredentialForRun(userId: string, credentialId: string) {
  const credential = await loadOwnedCredential(userId, credentialId);
  let apiKey: string;
  try {
    const { decryptCredential } = await import("@/server/integrations/credential-crypto");
    apiKey = decryptCredential(credential.encryptedKey);
  } catch {
    throw new CredentialServiceError("自带 Key 无法解密，请重新绑定。", "CREDENTIAL_UNREADABLE", 500);
  }
  return {
    baseUrl: credential.baseUrl,
    apiKey,
    label: credential.label,
    keyMasked: maskCredential(apiKey),
  };
}

export function assertModelKeyAvailable(modelKey: string | undefined | null) {
  const key = modelKey?.trim();
  if (!key) return undefined;
  if (!getRunModel(key)) {
    throw new CredentialServiceError("该模型暂未开放，请选择白名单内的模型。", "MODEL_UNAVAILABLE");
  }
  return key;
}
