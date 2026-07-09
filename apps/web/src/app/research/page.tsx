"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function ResearchWorkspacePage() {
	const router = useRouter();

	useEffect(() => {
		router.replace("/research/book");
	}, [router]);

	return null;
}
