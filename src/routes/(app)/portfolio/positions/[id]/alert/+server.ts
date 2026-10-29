import type { RequestHandler } from './$types';
import { alertForm, saveAlert } from '#lib/features/portfolio/holdings/actions.server.js';

// GET / POST /portfolio/positions/{id}/alert (requireTargetAlerts) — PortfolioPositionAlertForm / PortfolioPositionAlertSave
export const GET: RequestHandler = (event) => alertForm(event, event.params.id);
export const POST: RequestHandler = (event) => saveAlert(event, event.params.id);
