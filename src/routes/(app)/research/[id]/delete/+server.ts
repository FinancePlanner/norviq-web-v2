import type { RequestHandler } from './$types';
import { Feature } from '#lib/billing.js';
import { requireFeature } from '#lib/server/guards.js';
import { deleteResearch } from '#lib/features/planning-tools/research/research.server.js';

// POST /research/{id}/delete (handlers.ResearchDelete): 303 to /research, or a bare error status.
export const POST: RequestHandler = async (event) => {
	await requireFeature(event, Feature.AdvancedResearch, 'Advanced research');
	return deleteResearch(event);
};
