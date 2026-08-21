import { MetadataRoute } from "next";
import { siteUrl } from "@/data/restaurantInfo";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/admin",
        "/admin/*",
        "/api/*",
        "/cart",
        "/checkout",
        "/orders",
        "/profile",
        "/login",
        "/signup",
        "/reset-password",
        "/cashier",
      ],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
