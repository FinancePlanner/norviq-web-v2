import type { RequestHandler } from './$types';
import { createPosition } from '#lib/features/portfolio/holdings/actions.server.js';

// POST /portfolio/positions — PortfolioCreatePosition
export const POST: RequestHandler = (event) => createPosition(event);
