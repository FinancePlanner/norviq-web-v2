import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import {
	duplicatePosition,
	terminalID
} from '#lib/features/planning-tools/terminal/terminal.server.js';

// POST /terminal/positions/{id}/duplicate (TerminalPositionDuplicate).
export const POST: RequestHandler = (event) => {
	const id = terminalID(event);
	if (!id) error(404, 'Not Found');
	return duplicatePosition(event, id);
};
