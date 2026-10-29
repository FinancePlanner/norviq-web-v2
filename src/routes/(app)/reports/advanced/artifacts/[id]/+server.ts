import type { RequestHandler } from './$types';
import { Feature } from '#lib/billing.js';
import { requireFeature } from '#lib/server/guards.js';
import { artifactRedirect } from '#lib/features/insights/reports/advanced.server.js';

// handlers.AdvancedReportArtifact: Go never streamed the file; it 303s to the
// backend's signed, expiring download link (http/https only), so this does too.
export const GET: RequestHandler = async (event) => {
	await requireFeature(event, Feature.AdvancedReportRuns, 'Advanced reports');
	return artifactRedirect(event, event.params.id);
};
