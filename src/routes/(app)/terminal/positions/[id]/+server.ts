import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import {
	deletePosition,
	terminalID,
	updatePosition
} from '#lib/features/planning-tools/terminal/terminal.server.js';

// PATCH /terminal/positions/{id} (TerminalPositionUpdate): one cell edit or an
// AI Accept; answers a RowEditResult. DELETE (TerminalPositionDelete) answers
// the workspace.
export const PATCH: RequestHandler = (event) => {
	const id = terminalID(event);
	if (!id) error(404, 'Not Found');
	return updatePosition(event, id);
};

export const DELETE: RequestHandler = (event) => {
	const id = terminalID(event);
	if (!id) error(404, 'Not Found');
	return deletePosition(event, id);
};
