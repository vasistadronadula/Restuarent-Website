import { MetadataRoute } from "next";
import { siteUrl } from "@/data/restaurantInfo";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = siteUrl;
  const lastModified = new Date();

  // Only publicly reachable pages belong here. `/orders` used to be listed at
  // priority 0.7 while robots.ts disallowed it and the page itself requires a
  // session — three sources contradicting each other, which is exactly the
  // shape that gets a site's crawl budget spent on soft-404s.
  return [
    { url: baseUrl, lastModified, changeFrequency: "daily", priority: 1.0 },
    { url: `${baseUrl}/menu`, lastModified, changeFrequency: "daily", priority: 0.9 },
    { url: `${baseUrl}/contact`, lastModified, changeFrequency: "monthly", priority: 0.7 },
    { url: `${baseUrl}/privacy-policy`, lastModified, changeFrequency: "yearly", priority: 0.3 },
    { url: `${baseUrl}/terms`, lastModified, changeFrequency: "yearly", priority: 0.3 },
    { url: `${baseUrl}/refund-policy`, lastModified, changeFrequency: "yearly", priority: 0.3 },
  ];
}
