import type { PageServerLoad } from './$types';
import { loadPostPage } from '#lib/features/social/boards/boards.server.js';

// GET /boards/{slug}/p/{id} (handlers.BoardsPost → renderBoardsPost). The slug
// only shapes the URL; the post is fetched by id.
export const load: PageServerLoad = (event) => loadPostPage(event, event.params.id);
