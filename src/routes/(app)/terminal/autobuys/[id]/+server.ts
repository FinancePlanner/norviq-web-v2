import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import {
	deleteAutobuy,
	terminalID,
	updateAutobuy
} from '#lib/features/planning-tools/terminal/terminal.server.js';

// PATCH /terminal/autobuys/{id} (TerminalAutobuyUpdate) and DELETE
// (TerminalAutobuyDelete). Both answer the panel.
export const PATCH: RequestHandler = (event) => {
	const id = terminalID(event);
	if (!id) error(404, 'Not Found');
	return updateAutobuy(event, id);
};

export const DELETE: RequestHandler = (event) => {
	const id = terminalID(event);
	if (!id) error(404, 'Not Found');
	return deleteAutobuy(event, id);
};
