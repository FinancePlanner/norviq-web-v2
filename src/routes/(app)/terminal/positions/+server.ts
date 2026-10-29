import type { RequestHandler } from './$types';
import { createPosition } from '#lib/features/planning-tools/terminal/terminal.server.js';

// POST /terminal/positions (TerminalPositionCreate): the create form and the
// sample's "Use this row". Answers the workspace as JSON (Go: the #terminal-workspace fragment).
export const POST: RequestHandler = (event) => createPosition(event);
