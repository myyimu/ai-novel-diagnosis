"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function DiagnoseWorkspacePage() {
	const router = useRouter();

	useEffect(() => {
		router.replace("/diagnose/quick");
	}, [router]);

	return null;
}
