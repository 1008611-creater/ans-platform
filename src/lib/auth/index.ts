import NextAuth, { type Account } from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { db } from "@/lib/db";
import { getConfig } from "@/lib/config";
import { initializePlugins, getAuthPlugin } from "@/lib/plugins";
import type { Adapter } from "next-auth/adapters";

// Initialize plugins before use
initializePlugins();

// 注册仅允许走 /register 的验证码、Turnstile 与邀请码流程。
function CustomPrismaAdapter(): Adapter {
  const prismaAdapter = PrismaAdapter(db);

  return {
    ...prismaAdapter,
    async createUser() {
      throw new Error("ANS 禁止通过认证适配器创建或认领账号，请使用 /register 注册。");
    },
  };
}

// Helper to get providers from config (supports both old `provider` and new `providers` array)
function getConfiguredProviders(config: Awaited<ReturnType<typeof getConfig>>): string[] {
  // Support new `providers` array
  if (config.auth.providers && config.auth.providers.length > 0) {
    return config.auth.providers;
  }
  // Backward compatibility with old `provider` string
  if (config.auth.provider) {
    return [config.auth.provider];
  }
  // Default to credentials
  return ["credentials"];
}

// Build auth config dynamically based on prompts.config.ts
async function buildAuthConfig() {
  const config = await getConfig();
  const providerIds = getConfiguredProviders(config);
  
  const authProviders = providerIds
    .map((id) => {
      const plugin = getAuthPlugin(id);
      if (!plugin) {
        console.warn(`Auth plugin "${id}" not found, skipping`);
        return null;
      }
      return plugin.getProvider();
    })
    .filter((p): p is NonNullable<typeof p> => p !== null);

  if (authProviders.length === 0) {
    throw new Error(`No valid auth plugins found. Configured: ${providerIds.join(", ")}`);
  }

  return {
    adapter: CustomPrismaAdapter(),
    providers: authProviders,
    session: {
      strategy: "jwt" as const,
    },
    pages: {
      signIn: "/login",
      signUp: "/register",
      error: "/login",
    },
    callbacks: {
      async signIn({ account }: { account?: Account | null }) {
        // 密码登录沿用 provider 的 authorize 校验，不要求 OAuth 绑定。
        if (account?.type === "credentials") return true;
        if (!account?.provider || !account.providerAccountId) return false;

        // 非密码登录只能使用既有绑定，不能凭邮箱自动链接或认领账号。
        const linkedAccount = await db.account.findUnique({
          where: {
            provider_providerAccountId: {
              provider: account.provider,
              providerAccountId: account.providerAccountId,
            },
          },
          select: { user: { select: { deletedAt: true, flagged: true } } },
        });
        const linkedUser = linkedAccount?.user;
        return !!linkedUser && linkedUser.deletedAt === null && !linkedUser.flagged;
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      async jwt({ token, user, trigger }: { token: any; user?: any; trigger?: string }) {
        // On sign in, look up the actual database user by email to ensure correct ID
        if (user && user.email) {
          const dbUser = await db.user.findFirst({
            where: { email: user.email, deletedAt: null },
            select: { id: true, role: true, username: true, locale: true, name: true, avatar: true },
          });

          if (dbUser) {
            token.id = dbUser.id;
            token.role = dbUser.role;
            token.username = dbUser.username;
            token.locale = dbUser.locale;
            token.name = dbUser.name;
            token.picture = dbUser.avatar;
          }
        }

        // On subsequent requests, verify user exists and refresh data
        if (token.id && !user) {
          const dbUser = await db.user.findFirst({
            where: { id: token.id as string, deletedAt: null },
            select: { id: true, role: true, username: true, locale: true, name: true, avatar: true },
          });

          // User no longer exists - invalidate token
          if (!dbUser) {
            return null;
          }

          // Refresh mutable identity fields on every request so role changes take effect immediately.
          // This prevents a demoted administrator from retaining stale JWT permissions.
          token.role = dbUser.role;
          token.username = dbUser.username;
          token.locale = dbUser.locale;
          token.name = dbUser.name;
          token.picture = dbUser.avatar;
        }

        return token;
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      async session({ session, token }: { session: any; token: any }) {
        // If token is null/invalid, return empty session
        if (!token) {
          return { ...session, user: undefined };
        }
        if (token && session.user) {
          session.user.id = token.id as string;
          session.user.role = token.role as string;
          session.user.username = token.username as string;
          session.user.locale = token.locale as string;
          session.user.name = token.name ?? null;
          session.user.image = token.picture ?? null;
        }
        return session;
      },
    },
  };
}

// Export auth handlers
const authConfig = await buildAuthConfig();

export const { handlers, signIn, signOut, auth } = NextAuth(authConfig);

// Extended session type
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      name?: string | null;
      image?: string | null;
      role: string;
      username: string;
      locale: string;
    };
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    id: string;
    role: string;
    username: string;
    locale: string;
    name?: string | null;
    picture?: string | null;
  }
}
