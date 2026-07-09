"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function ProjectWorkspacePage() {
	const router = useRouter();

	useEffect(() => {
		router.replace("/project/current");
	}, [router]);

	return null;
}
