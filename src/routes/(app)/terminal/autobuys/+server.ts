import type { RequestHandler } from './$types';
import { createAutobuy } from '#lib/features/planning-tools/terminal/terminal.server.js';

// POST /terminal/autobuys (TerminalAutobuyCreate). Answers the panel (AutobuysVM).
export const POST: RequestHandler = (event) => createAutobuy(event);
