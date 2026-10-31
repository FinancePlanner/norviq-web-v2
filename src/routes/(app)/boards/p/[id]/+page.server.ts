import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { BOARD_NOTICES, pathEscape, withNotice } from '#lib/features/social/boards/boards.js';
import { boardsFailure, getBoardPost } from '#lib/features/social/boards/boards.server.js';

// GET /boards/p/{id} (handlers.BoardsPostRedirect): resolves to the post's
// real address, carrying a known ?notice= along.
export const load: PageServerLoad = async (event) => {
	const id = event.params.id;
	let detail;
	try {
		detail = await getBoardPost(event, id);
	} catch (err) {
		boardsFailure(err, 'post');
	}
	let target = '/boards/' + pathEscape(detail.post.boardSlug) + '/p/' + pathEscape(id);
	const notice = event.url.searchParams.get('notice') ?? '';
	if (Object.hasOwn(BOARD_NOTICES, notice) && BOARD_NOTICES[notice] !== '')
		target = withNotice(target, notice);
	redirect(303, target);
};
