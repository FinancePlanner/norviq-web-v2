import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import {
	setAutobuyActive,
	terminalID
} from '#lib/features/planning-tools/terminal/terminal.server.js';

// POST /terminal/autobuys/{id}/active (TerminalAutobuyActive), the per-row switch.
export const POST: RequestHandler = (event) => {
	const id = terminalID(event);
	if (!id) error(404, 'Not Found');
	return setAutobuyActive(event, id);
};
