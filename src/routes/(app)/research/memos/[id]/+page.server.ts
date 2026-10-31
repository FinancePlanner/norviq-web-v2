import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { Feature } from '#lib/billing.js';
import { requireFeature } from '#lib/server/guards.js';
import {
	aiConsentReturnPath,
	isAIConsentRequired
} from '#lib/features/dashboard/ai-consent.server.js';
import {
	loadMemoPage,
	MemoNotFoundError,
	parseUUID
} from '#lib/features/planning-tools/research/research.server.js';

// GET /research/memos/{id} (handlers.ResearchMemo), behind
// RequireFeature(AIInsights). Go has no consent gate here; when the backend
// enforces consent it refuses /v1/ai/* with 403 AI_CONSENT_REQUIRED, which
// renders the consent prompt instead of an error. A bad or unknown id is a 404 rendered as
// research.MemoNotFound by ./+error.svelte.
export const load: PageServerLoad = async (event) => {
	await requireFeature(event, Feature.AIInsights, 'AI insights');
	const id = parseUUID(event.params.id);
	if (!id) error(404, 'Memo not found');
	try {
		return { aiConsentRequired: false as const, vm: await loadMemoPage(event, id) };
	} catch (err) {
		if (err instanceof MemoNotFoundError) error(404, 'Memo not found');
		if (isAIConsentRequired(err))
			return { aiConsentRequired: true as const, next: aiConsentReturnPath(event) };
		console.error('position memo load failed', id, err);
		error(502, 'Memo is temporarily unavailable');
	}
};
