import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { movePosition, terminalID } from '#lib/features/planning-tools/terminal/terminal.server.js';

// POST /terminal/positions/{id}/move (TerminalPositionMove), dir=up|down.
export const POST: RequestHandler = (event) => {
	const id = terminalID(event);
	if (!id) error(404, 'Not Found');
	return movePosition(event, id);
};
