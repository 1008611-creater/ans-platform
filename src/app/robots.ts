import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.AUTH_URL || process.env.NEXTAUTH_URL || "https://ans.cauai.fun";

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/api/",
          "/workspace",
          "/projects",
          "/collection",
          "/market/creator",
          "/market/orders",
          "/workflows/mine",
          "/workflows/runs",
          "/admin/",
          "/settings/",
          "/login",
          "/register",
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
