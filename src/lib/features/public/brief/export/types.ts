// Client-safe types for the brief Export Studio.

/** The formats the backend renders: link preview, social post, story, A4 PDF. */
export type ExportFormat = 'og' | 'social' | 'story' | 'pdf';

/** One rendered export in the manifest; `url` is root-relative and immutable when versioned. */
export interface WebExportFormat {
	id: ExportFormat;
	url: string;
	width?: number;
	height?: number;
	pages?: number;
	mime: string;
}

/** GET /brief/{date}/{slot}/exports.json: what the studio can preview and download. */
export interface WebExportManifest {
	editionId: string;
	revision: number;
	rendererVersion: number;
	formats: WebExportFormat[];
}
