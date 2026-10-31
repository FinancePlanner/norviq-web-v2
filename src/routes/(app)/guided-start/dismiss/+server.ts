import { json, type RequestHandler } from '@sveltejs/kit';
import {
	getOnboardingProgress,
	patchOnboardingProgress
} from '#lib/features/auth-onboarding/onboarding/onboarding.server.js';
import { DISMISS_FAILED } from '#lib/features/auth-onboarding/guided-start/guide.js';
import { guidedCardVM } from '#lib/features/auth-onboarding/guided-start/guided.server.js';

// POST /guided-start/dismiss (guided_start.go GuidedStartDismiss). The card is
// hidden optimistically; on failure the answer carries the card to put back,
// with the reason.
export const POST: RequestHandler = async (event) => {
	try {
		await patchOnboardingProgress(event, { guidedStartDismissed: true });
		return json({ ok: true });
	} catch (err) {
		console.warn('guided start: dismiss', err);
	}
	return json({
		ok: false,
		card: await guidedCardVM(event, await getOnboardingProgress(event), DISMISS_FAILED)
	});
};
