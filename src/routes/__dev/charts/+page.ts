import { error } from '@sveltejs/kit';
import { dev } from '$app/env';
import type { PageLoad } from './$types';

// DEV ONLY: gallery of every #lib/charts builder. 404 outside `vite dev`.
export const load: PageLoad = () => {
	if (!dev) error(404, 'Not found');
	return {};
};
