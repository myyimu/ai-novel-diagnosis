declare module "dom-anchor-text-quote" {
	export interface TextQuoteSelector {
		exact: string;
		prefix?: string;
		suffix?: string;
	}

	export interface TextPositionSelector {
		start: number;
		end: number;
	}

	export function toTextPosition(
		root: { textContent: string | null },
		selector: TextQuoteSelector,
		options?: { hint?: number },
	): TextPositionSelector | null;
}
