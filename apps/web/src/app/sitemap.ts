import type { MetadataRoute } from "next";

const staticRoutes = [
	{
		path: "/",
		priority: 1,
	},
	{
		path: "/diagnose/quick",
		priority: 0.8,
	},
	{
		path: "/project/current",
		priority: 0.8,
	},
	{
		path: "/research/book",
		priority: 0.6,
	},
] as const;

export default function sitemap(): MetadataRoute.Sitemap {
	const siteUrl =
		process.env.NEXT_PUBLIC_SITE_URL ??
		(process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://127.0.0.1:3000");
	const now = new Date();

	return staticRoutes.map((route) => ({
		url: `${siteUrl}${route.path}`,
		lastModified: now,
		changeFrequency: "weekly",
		priority: route.priority,
	}));
}
