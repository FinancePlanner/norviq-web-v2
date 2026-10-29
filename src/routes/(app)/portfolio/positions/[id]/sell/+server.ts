import type { RequestHandler } from './$types';
import { sellForm, sellPosition } from '#lib/features/portfolio/holdings/actions.server.js';

// GET / POST /portfolio/positions/{id}/sell — PortfolioPositionSellForm / PortfolioPositionSell
export const GET: RequestHandler = (event) => sellForm(event, event.params.id);
export const POST: RequestHandler = (event) => sellPosition(event, event.params.id);
