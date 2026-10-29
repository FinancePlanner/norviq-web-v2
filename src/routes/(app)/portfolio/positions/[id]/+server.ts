import type { RequestHandler } from './$types';
import { deletePosition, updatePosition } from '#lib/features/portfolio/holdings/actions.server.js';

// PUT / DELETE /portfolio/positions/{id} — PortfolioPositionUpdate / PortfolioPositionDelete
export const PUT: RequestHandler = (event) => updatePosition(event, event.params.id);
export const DELETE: RequestHandler = (event) => deletePosition(event, event.params.id);
