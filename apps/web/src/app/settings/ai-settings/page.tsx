"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AISettingsPage() {
	const router = useRouter();

	useEffect(() => {
		router.replace("/settings/provider");
	}, [router]);

	return null;
}
