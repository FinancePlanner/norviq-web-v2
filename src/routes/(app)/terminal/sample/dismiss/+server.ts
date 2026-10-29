import type { RequestHandler } from './$types';
import { dismissSample } from '#lib/features/planning-tools/terminal/terminal.server.js';

// POST /terminal/sample/dismiss (TerminalSampleDismiss): a year-long cookie.
export const POST: RequestHandler = (event) => dismissSample(event);
