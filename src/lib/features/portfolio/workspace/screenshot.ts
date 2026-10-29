// pages/portfolio viewmodel.go ScreenshotImportVM + screenshot_import_helpers.go.

/** api.MaxScreenshotImages (mirrors the backend's per-request cap). */
export const MAX_SCREENSHOT_IMAGES = 3;

export interface ScreenshotImportRowVM {
	line: number;
	symbol: string;
	shares: string;
	buyPrice: string;
	buyDate: string;
	confidence: number;
	/** A symbol already imported from this provider, which this row overwrites. */
	willReplace: boolean;
	/** Any position already held for the symbol ("none" | "manual" | "imported" | "mixed"). */
	existing: string;
}

export interface ScreenshotImportVM {
	provider: string;
	portfolioListID: string;
	kind: string;
	rows: ScreenshotImportRowVM[];
	errors: string[];
	error: string;
	imageCount: number;
	committed: boolean;
	inserted: number;
	updated: number;
	replacedSymbols: string[];
	maxImages: number;
	/** A commit refused (409) because it would duplicate holdings it does not own. */
	needsMergeConfirm: boolean;
}

export function newScreenshotImportVM(provider: string, portfolioListID: string): ScreenshotImportVM {
	return {
		provider: provider.trim() || 'manual',
		portfolioListID: portfolioListID.trim(),
		kind: '',
		rows: [],
		errors: [],
		error: '',
		imageCount: 0,
		committed: false,
		inserted: 0,
		updated: 0,
		replacedSymbols: [],
		maxImages: MAX_SCREENSHOT_IMAGES,
		needsMergeConfirm: false
	};
}

/** Symbols already held from somewhere other than this import; committing replaces them. */
export function conflictSymbols(vm: ScreenshotImportVM): string[] {
	const seen = new Set<string>();
	const out: string[] = [];
	for (const row of vm.rows) {
		if (row.willReplace || row.existing === '' || row.existing === 'none') continue;
		if (seen.has(row.symbol)) continue;
		seen.add(row.symbol);
		out.push(row.symbol);
	}
	return out;
}

/** A holdings screen carries no purchase price. */
export const hasCostBasis = (vm: ScreenshotImportVM) => vm.kind === 'trades';

export function kindLabel(vm: ScreenshotImportVM): string {
	if (vm.kind === 'holdings') return 'Holdings list';
	if (vm.kind === 'trades') return 'Trade confirmations';
	return 'Unrecognized';
}

/** Worth a second look; deliberately generous. */
export const lowConfidence = (row: ScreenshotImportRowVM) => row.confidence > 0 && row.confidence < 0.75;

export function screenshotImportSummary(inserted: number, updated: number): string {
	if (inserted > 0 && updated > 0) return `Added ${inserted} position(s) and updated ${updated}.`;
	if (inserted > 0) return `Added ${inserted} position(s).`;
	if (updated > 0) return `Updated ${updated} position(s).`;
	return 'Nothing was imported.';
}
