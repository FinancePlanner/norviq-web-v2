import { socialOff, type SocialConfig } from '../nav.js';
import type { NavContext } from './visible.js';

/**
 * The NavContext behind the shell's layout data ((app)/+layout.server.ts), so the
 * client shell and the index pages filter and badge exactly as the server sidebar
 * does: no Pro badges while entitlement is unknown (featureLockedPredicate).
 */
export function navContextFrom(data: {
	social?: SocialConfig;
	articles?: boolean;
	features?: Record<string, boolean>;
	billingUnknown?: boolean;
}): NavContext {
	const { features } = data;
	return {
		social: data.social ?? socialOff,
		articles: data.articles === true,
		locked: features && data.billingUnknown !== true ? (f) => !features[f] : null
	};
}
