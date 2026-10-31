import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { Feature } from '#lib/billing.js';
import { requireFeature } from '#lib/server/guards.js';
import {
	aiConsentRequiredJSON,
	aiConsentReturnPath,
	isAIConsentRequired
} from '#lib/features/dashboard/ai-consent.server.js';
import { bookmarkMemo, parseUUID } from '#lib/features/planning-tools/research/research.server.js';

// POST /research/memos/{id}/bookmark (handlers.ResearchMemoBookmark),
// bookmarked=true|false. Go answered the MemoSaveButton fragment; this
// answers the backend's PositionMemoCard and the button re-renders from it.
export const POST: RequestHandler = async (event) => {
	await requireFeature(event, Feature.AIInsights, 'AI insights');
	const id = parseUUID(event.params.id);
	if (!id) error(400, 'Invalid memo');
	let bookmarked = false;
	try {
		bookmarked = String((await event.request.formData()).get('bookmarked') ?? '') === 'true';
	} catch {
		/* Go's FormValue on a bad body reads "" */
	}
	try {
		return json(await bookmarkMemo(event, id, bookmarked));
	} catch (err) {
		if (isAIConsentRequired(err))
			return json(aiConsentRequiredJSON(aiConsentReturnPath(event)), { status: 403 });
		return new Response('Memo could not be saved\n', { status: 502 });
	}
};
