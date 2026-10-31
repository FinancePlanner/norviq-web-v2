import { error, json, type RequestHandler } from '@sveltejs/kit';
import { parseSlugCode } from '#lib/features/public/articles/articles.js';
import {
	boardsErrorText,
	requireArticles,
	voteArticle
} from '#lib/features/public/articles/articles.server.js';

// POST /articles/{code}/vote → ArticlesHandler.Vote. Go returned the
// VoteButton fragment; this returns {upvoteCount, voted} for VoteButton.svelte.
// on=false removes the vote; anything else casts it.
export const POST: RequestHandler = async (event) => {
	await requireArticles(event);
	const code = parseSlugCode(event.params.code ?? '');
	if (!code) error(404, 'Not Found');
	let on = true;
	try {
		on = (await event.request.formData()).get('on') !== 'false';
	} catch {
		/* cast */
	}
	try {
		const vote = await voteArticle(event, code, on);
		return json({ upvoteCount: vote.upvoteCount, voted: vote.voted });
	} catch (err) {
		return new Response(boardsErrorText(err), {
			status: 422,
			headers: { 'Content-Type': 'text/plain; charset=utf-8' }
		});
	}
};
