import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { APIError, apiJSON } from '#lib/server/api.js';
import { buildDigestPage, focusAnchor } from '#lib/features/digest/viewmodel.js';
import type { DigestResponse } from '#lib/features/digest/types.js';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// One weekly digest: where every "Open in Norviq" link in the digest email
// lands (norviq-backend-v2 digest Renderer.link: /digest/<id>?s=<anchor>&src=email).
// Signed-out readers go through /login?next= in hooks.server.ts and come back
// here. Someone else's id, a missing one, or digests turned off all 404.
export const load: PageServerLoad = async (event) => {
	const id = event.params.id;
	if (!UUID.test(id)) error(404, 'Not Found');
	let resp: DigestResponse;
	try {
		resp = await apiJSON<DigestResponse>(event, 'GET', '/v1/digests/' + id.toLowerCase());
	} catch (err) {
		if (err instanceof APIError && err.status === 404) error(404, 'Not Found');
		throw err;
	}
	return {
		vm: buildDigestPage(resp),
		focus: focusAnchor(event.url.searchParams.get('s'))
	};
};
