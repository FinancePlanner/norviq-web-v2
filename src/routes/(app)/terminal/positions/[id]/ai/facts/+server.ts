import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { aiSuggest, terminalID } from '#lib/features/planning-tools/terminal/terminal.server.js';

// POST /terminal/positions/{id}/ai/facts (TerminalAIFacts). Answers a SuggestionResult.
export const POST: RequestHandler = (event) => {
	const id = terminalID(event);
	if (!id) error(404, 'Not Found');
	return aiSuggest(event, id, 'facts');
};
