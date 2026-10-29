// Port of norviq-web internal/pages/legal (document.go, urls.go, the types in
// legal.templ). documents.json is the output of content.go + notices.go
// (PrivacyPolicy, TermsOfUse, LegalNotice, SecurityOverview,
// FacebookDataDeletion) dumped with encoding/json, so the published text is
// byte-identical. Regenerate it from the Go package when the legal text changes.
import documents from './documents.json';

export interface Link {
	label: string;
	href: string;
}

export interface Table {
	caption: string;
	headers: string[] | null;
	rows: string[][] | null;
}

export interface Section {
	id: string;
	heading: string;
	body: string[] | null;
	table: Table | null;
	links: Link[] | null;
}

export interface Document {
	title: string;
	lastUpdated: string;
	intro: string;
	sections: Section[];
}

export type DocumentKey = 'privacy' | 'terms' | 'legal' | 'security' | 'facebook';

export function legalDocument(key: DocumentKey): Document {
	return (documents as Record<DocumentKey, Document>)[key];
}

/** Absolute joins a site-relative path onto publicBase (the path alone without one). */
export function absolute(publicBase: string, path: string): string {
	if (!publicBase) return path;
	return publicBase.replace(/\/+$/, '') + path;
}

export function metaDescription(doc: Document): string {
	const intro = doc.intro.trim();
	return intro || doc.title + ' for Norviq.';
}

/** hasHeaders: a key/value table (the imprint) renders without a header row. */
export function hasHeaders(headers: string[] | null): boolean {
	return (headers ?? []).some((h) => h.trim() !== '');
}
