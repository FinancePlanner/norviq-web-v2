import { config } from '#lib/server/env.js';
import { legalDocument, type DocumentKey } from './legal.js';

// LegalHandler.render: the document, PUBLIC_BASE_URL for the canonical/OG
// URLs and the request path (Go passes r.URL.Path).
export function loadLegal(key: DocumentKey, path: string) {
	return { doc: legalDocument(key), publicBase: config().publicBaseURL, path };
}
