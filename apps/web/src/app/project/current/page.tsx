import { Suspense } from "react";

import { ProjectCurrentPage } from "@/components/workspace/project/ProjectCurrentPage";

export default function CurrentProjectPage() {
	return (
		<Suspense fallback={null}>
			<ProjectCurrentPage />
		</Suspense>
	);
}
