// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NextAuthConfig } from "next-auth";
import type { Adapter, AdapterUser } from "next-auth/adapters";

const mocks = vi.hoisted(() => ({
  nextAuth: vi.fn(() => ({ handlers: {}, signIn: vi.fn(), signOut: vi.fn(), auth: vi.fn() })),
  getConfig: vi.fn(),
  getAuthPlugin: vi.fn(),
  db: {
    user: {
      findUnique: vi.fn(), findFirst: vi.fn(), create: vi.fn(), update: vi.fn(),
    },
    account: { findUnique: vi.fn(), create: vi.fn() },
  },
}));

vi.mock("next-auth", () => ({ default: mocks.nextAuth }));
vi.mock("@/lib/db", () => ({ db: mocks.db }));
vi.mock("@/lib/config", () => ({ getConfig: mocks.getConfig }));
vi.mock("@/lib/plugins", () => ({
  initializePlugins: vi.fn(),
  getAuthPlugin: mocks.getAuthPlugin,
}));

const localUser = {
  id: "local-user", email: "member@example.test", name: "会员", image: null,
  avatar: null, emailVerified: null, username: "member", locale: "zh", role: "USER",
  deletedAt: null, flagged: false, passwordChangedAt: null,
};
const externalProviders = [
  ["github", "oauth"],
  ["google", "oidc"],
  ["future-provider", "oauth"],
  ["future-oidc", "oidc"],
] as const;

type SignInArgs = Parameters<NonNullable<NonNullable<NextAuthConfig["callbacks"]>["signIn"]>>[0];

async function loadConfig(providers = ["credentials"]) {
  mocks.getConfig.mockResolvedValue({ auth: { providers, allowRegistration: true } });
  await import("@/lib/auth");
  return (mocks.nextAuth.mock.calls as unknown as [[NextAuthConfig]])[0][0];
}

// 缺少回调时采用 Auth.js 的默认放行行为，使红灯体现真实授权漏洞。
async function signIn(config: NextAuthConfig, args: SignInArgs) {
  return config.callbacks?.signIn ? config.callbacks.signIn(args) : true;
}

function externalSignIn(provider = "github", type: "oauth" | "oidc" = "oauth"): SignInArgs {
  return {
    user: { ...localUser },
    account: { provider, type, providerAccountId: "remote-subject" },
  };
}

beforeEach(() => {
  vi.resetModules();
  vi.resetAllMocks();
  mocks.nextAuth.mockReturnValue({ handlers: {}, signIn: vi.fn(), signOut: vi.fn(), auth: vi.fn() });
  mocks.getAuthPlugin.mockImplementation((id: string) => ({
    getProvider: () => ({
      id,
      type: id === "credentials" ? "credentials" : id.includes("oidc") || id === "google" ? "oidc" : "oauth",
      allowDangerousEmailAccountLinking: true,
    }),
  }));
  mocks.db.user.findUnique.mockResolvedValue(null);
  mocks.db.user.findFirst.mockResolvedValue(null);
  mocks.db.user.create.mockResolvedValue({ ...localUser });
  mocks.db.user.update.mockResolvedValue({ ...localUser });
  mocks.db.account.findUnique.mockResolvedValue(null);
});

describe("ANS adapter 注册防线", () => {
  it.each(externalProviders)("配置开启 %s 后 adapter 仍明确拒绝新建用户", async (provider) => {
    const config = await loadConfig(["credentials", provider]);
    const adapter = config.adapter as Adapter;

    await expect(adapter.createUser!({ ...localUser })).rejects.toThrow(/register/i);
    expect(mocks.db.user.create).not.toHaveBeenCalled();
    expect(mocks.db.user.update).not.toHaveBeenCalled();
    expect(mocks.db.account.create).not.toHaveBeenCalled();
  });

  it("提供 username 和同名 unclaimed 账号也不能认领或写库", async () => {
    const config = await loadConfig(["github"]);
    mocks.db.user.findUnique.mockResolvedValue({
      ...localUser, id: "unclaimed-user", email: "member@unclaimed.prompts.chat",
    });
    const profile: AdapterUser & { username: string; githubUsername: string } = {
      ...localUser, username: " Member ", githubUsername: "member",
    };

    await expect((config.adapter as Adapter).createUser!(profile)).rejects.toThrow(/register/i);
    expect(mocks.db.user.findUnique).not.toHaveBeenCalled();
    expect(mocks.db.user.update).not.toHaveBeenCalled();
    expect(mocks.db.user.create).not.toHaveBeenCalled();
  });
});

describe("ANS signIn 已绑定 Account 防线", () => {
  it.each(externalProviders)("%s 未绑定时即使邮箱匹配且允许自动链接也拒绝", async (provider, type) => {
    const config = await loadConfig(["credentials", provider]);
    mocks.db.user.findUnique.mockResolvedValue({ ...localUser });
    mocks.db.user.findFirst.mockResolvedValue({ ...localUser });

    expect(await signIn(config, externalSignIn(provider, type))).toBe(false);
    expect(mocks.db.account.findUnique).toHaveBeenCalledWith({
      where: { provider_providerAccountId: { provider, providerAccountId: "remote-subject" } },
      select: { user: { select: { deletedAt: true, flagged: true } } },
    });
    expect(mocks.db.user.findUnique).not.toHaveBeenCalled();
    expect(mocks.db.user.findFirst).not.toHaveBeenCalled();
    expect(mocks.db.account.create).not.toHaveBeenCalled();
  });

  it.each(externalProviders)("%s 已绑定正常老账号仍可登录且不改 provider", async (provider, type) => {
    const config = await loadConfig([provider]);
    mocks.db.account.findUnique.mockResolvedValue({ user: { ...localUser } });
    const args = externalSignIn(provider, type);
    args.user.email = null;

    expect(await signIn(config, args)).toBe(true);
    expect(config.providers).toEqual([expect.objectContaining({ id: provider, type })]);
    expect(mocks.db.account.findUnique).toHaveBeenCalledWith({
      where: { provider_providerAccountId: { provider, providerAccountId: "remote-subject" } },
      select: { user: { select: { deletedAt: true, flagged: true } } },
    });
    expect(mocks.db.user.findUnique).not.toHaveBeenCalled();
    expect(mocks.db.user.findFirst).not.toHaveBeenCalled();
    expect(mocks.db.user.create).not.toHaveBeenCalled();
    expect(mocks.db.user.update).not.toHaveBeenCalled();
    expect(mocks.db.account.create).not.toHaveBeenCalled();
  });

  it.each([
    ["已删除", { ...localUser, deletedAt: new Date("2026-01-01") }],
    ["已封禁", { ...localUser, flagged: true }],
    ["关联用户缺失", null],
  ])("查库发现%s时不信任回调传入的正常 user", async (_label, user) => {
    const config = await loadConfig(["github"]);
    mocks.db.account.findUnique.mockResolvedValue({ user });
    expect(await signIn(config, externalSignIn())).toBe(false);
  });

  it.each([
    ["无 Account", null],
    ["空 provider", { provider: "", type: "oauth", providerAccountId: "remote-subject" }],
    ["空 subject", { provider: "github", type: "oauth", providerAccountId: "" }],
  ] as const)("%s 时拒绝且不执行不完整的查询", async (_label, account) => {
    const config = await loadConfig();
    expect(await signIn(config, { user: { ...localUser }, account })).toBe(false);
    expect(mocks.db.account.findUnique).not.toHaveBeenCalled();
  });

  it.each(["credentials", "custom-password"])("%s 类型为 credentials 时由原 authorize 负责，不查 OAuth Account", async (provider) => {
    const config = await loadConfig();
    expect(await signIn(config, {
      user: { ...localUser }, account: { provider, type: "credentials", providerAccountId: localUser.id },
    })).toBe(true);
    expect(mocks.db.account.findUnique).not.toHaveBeenCalled();
    expect(mocks.db.user.findUnique).not.toHaveBeenCalled();
    expect(mocks.db.user.findFirst).not.toHaveBeenCalled();
  });

  it("名为 credentials 但类型为 OAuth 的 provider 不能绕过绑定校验", async () => {
    const config = await loadConfig();
    expect(await signIn(config, externalSignIn("credentials"))).toBe(false);
  });

  it("数据库故障时不能放行", async () => {
    const config = await loadConfig(["github"]);
    mocks.db.account.findUnique.mockRejectedValue(new Error("数据库不可用"));
    await expect(signIn(config, externalSignIn())).rejects.toThrow("数据库不可用");
  });
});

describe("ANS 现有 JWT 与 session 回归", () => {
  it("用户删除或不存在时使旧 JWT 失效", async () => {
    const config = await loadConfig();
    const jwt = config.callbacks!.jwt!;
    expect(await jwt({ token: { id: localUser.id, role: "ADMIN" } } as unknown as Parameters<typeof jwt>[0])).toBeNull();
    expect(mocks.db.user.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: localUser.id, deletedAt: null },
    }));
  });

  it.each([undefined, "update"] as const)("请求 trigger=%s 时刷新角色及可变身份字段", async (trigger) => {
    const config = await loadConfig();
    mocks.db.user.findFirst.mockResolvedValue({ ...localUser });
    const jwt = config.callbacks!.jwt!;
    expect(await jwt({
      token: { id: localUser.id, role: "ADMIN", username: "old", locale: "en", name: "旧名", picture: "old.png" },
      trigger,
    } as unknown as Parameters<typeof jwt>[0])).toEqual({
      id: "local-user", role: "USER", username: "member", locale: "zh", name: "会员", picture: null,
    });
  });

  it("密码在令牌签发后被修改时使旧 JWT 失效", async () => {
    const config = await loadConfig();
    mocks.db.user.findFirst.mockResolvedValue({ ...localUser, passwordChangedAt: new Date("2026-02-02T00:00:00.000Z") });
    const jwt = config.callbacks!.jwt!;
    expect(await jwt({
      token: { id: localUser.id, role: "USER", username: "member", locale: "zh", name: "会员", picture: null, pwdAt: new Date("2026-01-01T00:00:00.000Z").getTime() },
    } as unknown as Parameters<typeof jwt>[0])).toBeNull();
  });

  it("密码未变更时保持会话有效", async () => {
    const config = await loadConfig();
    const pwdAt = new Date("2026-01-01T00:00:00.000Z").getTime();
    mocks.db.user.findFirst.mockResolvedValue({ ...localUser, passwordChangedAt: new Date(pwdAt) });
    const jwt = config.callbacks!.jwt!;
    expect(await jwt({
      token: { id: localUser.id, role: "USER", username: "member", locale: "zh", name: "会员", picture: null, pwdAt },
    } as unknown as Parameters<typeof jwt>[0])).toEqual({
      id: "local-user", role: "USER", username: "member", locale: "zh", name: "会员", picture: null, pwdAt,
    });
  });

  it("登录时保留从数据库初始化 JWT 的行为", async () => {
    const config = await loadConfig();
    mocks.db.user.findFirst.mockResolvedValue({ ...localUser });
    const jwt = config.callbacks!.jwt!;
    expect(await jwt({ token: {}, user: { ...localUser } } as unknown as Parameters<typeof jwt>[0])).toMatchObject({
      id: "local-user", role: "USER", username: "member", locale: "zh",
    });
    expect(mocks.db.user.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: { email: localUser.email, deletedAt: null },
    }));
  });

  it("无效 JWT 不再生成已登录 session", async () => {
    const config = await loadConfig();
    const session = config.callbacks!.session!;
    expect(await session({ session: { user: localUser, expires: "later" }, token: null } as unknown as Parameters<typeof session>[0]))
      .toEqual({ user: undefined, expires: "later" });
  });
});
