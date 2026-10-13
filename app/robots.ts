import type { MetadataRoute } from "next";
import { site } from "@/content/site";

// Personal site shared by link, not meant to be found in search (SPEC §10).
export default function robots(): MetadataRoute.Robots {
  return site.noindex
    ? { rules: { userAgent: "*", disallow: "/" } }
    : { rules: { userAgent: "*", allow: "/" } };
}
