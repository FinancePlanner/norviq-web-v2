import { error, type RequestEvent } from '@sveltejs/kit';
import { isFeatureAvailable, isPro } from '../billing.js';
import { loadBillingContext } from './app-context.js';

// middleware.RequireFeature / RequirePro. Throws a 402 that (app)/+error.svelte
// renders as the Pro gate page, inside the app shell.
export async function requireFeature(event: RequestEvent, featureKey: string, featureName: string) {
	const billing = await loadBillingContext(event);
	const ok = featureKey ? isFeatureAvailable(billing, featureKey) : isPro(billing);
	if (!ok) error(402, { message: featureName || 'Norviq Pro', proGate: featureName || 'Norviq Pro' });
}

export const requirePro = (event: RequestEvent, featureName: string) => requireFeature(event, '', featureName);
