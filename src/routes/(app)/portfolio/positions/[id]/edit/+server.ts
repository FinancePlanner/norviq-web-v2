import type { RequestHandler } from './$types';
import { editForm } from '#lib/features/portfolio/holdings/actions.server.js';

// GET /portfolio/positions/{id}/edit — PortfolioPositionEditForm
export const GET: RequestHandler = (event) => editForm(event, event.params.id);
