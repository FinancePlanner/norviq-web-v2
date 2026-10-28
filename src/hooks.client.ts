import type { HandleClientError } from '@sveltejs/kit/hooks';
import { reportClientError } from '#lib/analytics/index.js';

// Analytics are initialised by the root layout (+layout.svelte) from
// data.runtime, the v2 replacement for /runtime-config.js. This hook only
// forwards unexpected client errors to Sentry once it is configured; Sentry
// itself is loaded lazily, so it adds nothing to the entry bundle.
export const handleError: HandleClientError = ({ error, kind }) => {
	if (kind === 'unknown') reportClientError(error);
};
