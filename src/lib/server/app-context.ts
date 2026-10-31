import type { RequestEvent } from '@sveltejs/kit';
import { api, apiJSON } from './api.js';
import { config } from './env.js';
import { featureLockedPredicate, isPro, isTrialExpired, type BillingContext } from '../billing.js';
import { socialOff, type SocialConfig } from '../nav.js';

// Per-request context every signed-in page needs: the billing context (Pro
// badges, feature gates, trial banner), the social flags and whether articles
// are on. Ports AttachProStatus, AttachSocialConfig and
// AttachArticlesAvailability from norviq-web internal/middleware.
//
// Social and articles are global backend flags, so — like the Go web's
// per-process caches — one copy per Worker isolate serves every reader.

interface Cached<T> {
	value: T;
	expires: number;
}

let socialCache: Cached<SocialConfig> | null = null;
let articlesCache: Cached<boolean> | null = null;

const OK_TTL = 60_000;
const FAIL_TTL = 10_000;

export async function loadSocialConfig(event: RequestEvent): Promise<SocialConfig> {
	if (!event.locals.session.accessToken) return socialOff;
	if (socialCache && Date.now() < socialCache.expires) return socialCache.value;
	let value = socialOff;
	let ttl = OK_TTL;
	try {
		value = {
			...socialOff,
			...(await apiJSON<Partial<SocialConfig>>(event, 'GET', '/v1/social/config', undefined, {
				signal: AbortSignal.timeout(3000)
			}))
		};
	} catch (err) {
		console.debug('social config unavailable; friends features off', err);
		ttl = FAIL_TTL;
	}
	socialCache = { value, expires: Date.now() + ttl };
	return value;
}

/** GET /v1/articles is the probe: 2xx on, 404 off (articles.go). */
export async function loadArticlesEnabled(event: RequestEvent): Promise<boolean> {
	if (!config().publicAPIToken) return false;
	if (articlesCache && Date.now() < articlesCache.expires) return articlesCache.value;
	let value = false;
	let ttl = FAIL_TTL;
	try {
		await apiJSON(event, 'GET', '/v1/articles', undefined, {
			auth: 'public',
			query: { limit: 1 },
			signal: AbortSignal.timeout(3000)
		});
		value = true;
		ttl = OK_TTL;
	} catch (err) {
		if ((err as { status?: number }).status === 404) ttl = OK_TTL;
	}
	articlesCache = { value, expires: Date.now() + ttl };
	return value;
}

export async function loadBillingContext(event: RequestEvent): Promise<BillingContext | null> {
	try {
		const res = await api(event).GET('/v1/billing/me');
		if (!res.response.ok || !res.data) {
			console.warn('billing context empty; entitlement unknown', res.response.status);
			return null;
		}
		return res.data as BillingContext;
	} catch (err) {
		console.warn('billing context fetch failed; entitlement unknown', err);
		return null;
	}
}

export async function loadAppContext(event: RequestEvent) {
	const [billing, social, articles] = await Promise.all([
		loadBillingContext(event),
		loadSocialConfig(event),
		loadArticlesEnabled(event)
	]);
	return {
		billing,
		billingUnknown: billing === null,
		isPro: isPro(billing),
		trialExpired: isTrialExpired(billing),
		social,
		articles,
		locked: featureLockedPredicate(billing)
	};
}
