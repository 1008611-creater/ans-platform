import { defineConfig } from "@/lib/config";

// 本地私有提示词库：使用自定义品牌，不展示 prompts.chat 的社区品牌和赞助内容
const useCloneBranding = true;

export default defineConfig({
  // Branding - customize for white-label
  branding: {
    name: "ANS",
    logo: "/ans-logo-light.svg",
    logoDark: "/ans-logo-dark.svg",
    favicon: "/favicon/favicon.svg",
    description: "让 AI 永不停转 · AI 原生社区与算力平台",
  },

  // Theme - design system configuration
  theme: {
    // Border radius: "none" | "sm" | "md" | "lg"
    radius: "sm",
    // UI style: "flat" | "default" | "brutal"
    variant: "default",
    // Spacing density: "compact" | "default" | "comfortable"
    density: "default",
    // Colors (hex or oklch)
    colors: {
  // Indigo 600。原先的 Indigo 500 (#6366f1) 在白色/浅色底上的对比度只有
  // 4.21:1，达不到 WCAG AA 对正文级文字的 4.5:1 要求；同色系加深一档后
  // 达到 5.92:1（浅色底）/ 6.29:1（纯白底），视觉上几乎不可分辨。
  primary: "#4f46e5",
    },
  },

  // Authentication plugins
  auth: {
    // Available: "credentials" | "google" | "azure" | "github" | "apple" | "oidc" | "oauth" | custom
    // Use `providers` array to enable multiple auth providers
    providers: ["credentials"],
    // 本地私有库：使用账号密码注册与登录，不依赖 GitHub/Google/Apple OAuth
    allowRegistration: true,
  },

  // Internationalization
  i18n: {
    locales: ["zh", "en"],
    defaultLocale: "zh",
  },

  // Features
  features: {
    // Allow users to create private prompts
    privatePrompts: true,
    // Enable change request system for versioning
    changeRequests: true,
    // Enable categories
    categories: true,
    // Enable tags
    tags: true,
    // 先关闭需要外部 API Key 的功能；关键词搜索、分类、标签、版本和 MCP 保持可用
    aiSearch: false,
    aiGeneration: false,
    // Enable MCP (Model Context Protocol) features including API key generation
    mcp: true,
    // Enable comments on prompts
    comments: true,
  },

  // Homepage customization
  homepage: {
    // Set to true to hide prompts.chat repo branding and use your own branding
    useCloneBranding,
    achievements: {
      enabled: !useCloneBranding,
    },
    sponsors: {
      enabled: !useCloneBranding,
      items: [
        // Add sponsors here
        { name: "Neon", className: 'py-1', logo: '/sponsors/neon.svg', darkLogo: '/sponsors/neon-dark.svg', url: "https://get.neon.com/VqfnMo4" },
        { name: "Clemta", logo: '/sponsors/clemta.webp', url: "https://clemta.com/?utm_source=prompts.chat" },
        { name: "Wiro.ai", className: 'py-1', darkLogo: '/sponsors/wiro.png', logo: '/sponsors/wiro.png', url: "https://wiro.ai/?utm_source=prompts.chat" },
        { name: "Cognition", logo: "/sponsors/cognition.svg", url: "https://wind.surf/prompts-chat" },
        { name: "CodeRabbit", className: 'py-1', logo: '/sponsors/coderabbit.svg', darkLogo: '/sponsors/coderabbit-dark.svg', url: "https://coderabbit.link/fatih" },
        { name: "Sentry", className: 'py-1', logo: '/sponsors/sentry.svg', darkLogo: '/sponsors/sentry-dark.svg', url: "https://sentry.io/?utm_source=prompts.chat" },

        { name: "eachlabs", className: 'py-[6px]', logo: '/sponsors/eachlabs.png', darkLogo: '/sponsors/eachlabs-dark.png', url: "https://www.eachlabs.ai/?utm_source=promptschat&utm_medium=referral" },
        { name: "CommandCode", className: 'py-1', logo: '/sponsors/commandcode.svg', darkLogo: '/sponsors/commandcode-dark.svg', url: "https://commandcode.ai/?utm_source=prompts.chat" },
      ],
    },
  },
});
