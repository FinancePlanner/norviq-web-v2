import { error, json, redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { Feature } from '#lib/billing.js';
import { requireFeature } from '#lib/server/guards.js';
import {
	aiConsentRequiredJSON,
	aiConsentReturnPath,
	isAIConsentRequired
} from '#lib/features/dashboard/ai-consent.server.js';
import { deleteMemo, parseUUID } from '#lib/features/planning-tools/research/research.server.js';

// POST /research/memos/{id}/delete (handlers.ResearchMemoDelete): 303 to /research.
export const POST: RequestHandler = async (event) => {
	await requireFeature(event, Feature.AIInsights, 'AI insights');
	const id = parseUUID(event.params.id);
	if (!id) error(400, 'Invalid memo');
	try {
		await deleteMemo(event, id);
	} catch (err) {
		if (isAIConsentRequired(err))
			return json(aiConsentRequiredJSON(aiConsentReturnPath(event)), { status: 403 });
		return new Response('Memo could not be deleted\n', { status: 502 });
	}
	redirect(303, '/research');
};
