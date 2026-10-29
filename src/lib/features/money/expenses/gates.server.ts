import { error, type RequestEvent } from '@sveltejs/kit';
import { isPro } from '#lib/billing.js';
import { loadBillingContext } from '#lib/server/app-context.js';

/** h.isPro(r) */
export async function isProRequest(event: RequestEvent): Promise<boolean> {
	return isPro(await loadBillingContext(event));
}

/** The handler-level `if !h.isPro(r) { ProGateOverlay(name) }` check: a 402 Pro gate. */
export async function requireProInline(event: RequestEvent, featureName: string) {
	if (!(await isProRequest(event))) error(402, { message: featureName, proGate: featureName });
}
