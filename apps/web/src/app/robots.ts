import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
	const siteUrl =
		process.env.NEXT_PUBLIC_SITE_URL ??
		(process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://127.0.0.1:3000");

	return {
		rules: {
			userAgent: "*",
			allow: "/",
		},
		sitemap: `${siteUrl}/sitemap.xml`,
	};
}
