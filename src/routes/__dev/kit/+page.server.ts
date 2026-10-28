import { error } from '@sveltejs/kit';
import { dev } from '$app/env';
import type { PageServerLoad } from './$types';

// DEV ONLY gallery of the Norviq kit (src/lib/components/norviq). 404 outside `vite dev`.
export const load: PageServerLoad = () => {
	if (!dev) error(404, 'Not found');
	return {};
};
