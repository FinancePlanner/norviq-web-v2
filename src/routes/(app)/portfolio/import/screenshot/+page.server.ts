import type { Actions, PageServerLoad } from './$types';
import { requireFeature } from '#lib/server/guards.js';
import { Feature } from '#lib/billing.js';
import { aiConsentGranted, aiConsentReturnPath } from '#lib/features/portfolio/ai-consent.server.js';
import { processScreenshotCommit, processScreenshotPreview, screenshotVMFrom } from '#lib/features/portfolio/workspace/screenshot.server.js';

// handlers/portfolio_screenshot_import.go.
//   GET  /portfolio/import/screenshot          requireScreenshotImport + RequireAIConsent
//   POST /portfolio/import/screenshot/preview  → ?/preview (same gates)
//   POST /portfolio/import/screenshot/commit   → ?/commit  (requireScreenshotImport only)

const FEATURE_NAME = 'Screenshot import';

export const load: PageServerLoad = async (event) => {
	await requireFeature(event, Feature.ScreenshotImport, FEATURE_NAME);
	if (!(await aiConsentGranted(event))) {
		// RenderAIConsentRequired for a navigation: the full consent page.
		return { consentRequired: true as const, next: aiConsentReturnPath(event), vm: screenshotVMFrom(event.url.searchParams) };
	}
	return { consentRequired: false as const, next: '', vm: screenshotVMFrom(event.url.searchParams) };
};

export const actions: Actions = {
	preview: async (event) => {
		await requireFeature(event, Feature.ScreenshotImport, FEATURE_NAME);
		// For an in-page submission Go answered with the inline consent card.
		if (!(await aiConsentGranted(event))) return { consentCard: aiConsentReturnPath(event) };
		const vm = await processScreenshotPreview(event);
		if (vm === 'consent') return { consentCard: aiConsentReturnPath(event) };
		return { screenshot: vm };
	},
	commit: async (event) => {
		await requireFeature(event, Feature.ScreenshotImport, FEATURE_NAME);
		return { screenshot: await processScreenshotCommit(event) };
	}
};
