import { defineParams } from '@sveltejs/kit/params';

// Route param matchers (SvelteKit 3: one module, `[name=matcher]` in a route).
// The build loads this file outside Vite, so it imports nothing from src: the keys
// are DOMAIN_ORDER (nav/destinations.ts), and shell.spec.ts fails if they drift.
const DOMAINS = ['today', 'money', 'wealth', 'planning', 'intelligence', 'community'] as const;

/** /[domain=domain]: the six domain index pages (/today … /community), nothing else. */
export const matchDomain = (param: string): (typeof DOMAINS)[number] | undefined =>
	DOMAINS.find((key) => key === param);

export const params = defineParams({ domain: matchDomain });
