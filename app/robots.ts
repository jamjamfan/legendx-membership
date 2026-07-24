import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://legendx.hk";
  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/course/", "/privacy", "/terms"],
      disallow: [
        "/admin/",
        "/member/",
        "/api/",
        "/checkout/",
        "/order/",
        "/login",
        "/register",
      ],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
