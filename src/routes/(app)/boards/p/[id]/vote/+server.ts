import { json, text } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { boardsErrorText, voteBoardPost } from '#lib/features/social/boards/boards.server.js';

// POST /boards/p/{id}/vote (handlers.BoardsVote). Go answered the VoteButton
// fragment for an hx-post swap; VoteButton.svelte fetches this and takes
// {score, voted}. A refusal is a 422 with the reason, and the button stays.
export const POST: RequestHandler = async (event) => {
	try {
		const vote = await voteBoardPost(event, event.params.id);
		return json({ score: vote.score, voted: vote.voted });
	} catch (err) {
		return text(boardsErrorText(err), { status: 422 });
	}
};
