import type { RequestHandler } from './$types';
import { deleteTargetAlert } from '#lib/features/portfolio/holdings/actions.server.js';

// DELETE /portfolio/targets/{id} (requireTargetAlerts) — PortfolioTargetDelete,
// the holdings price-alert panel's "Remove alert". Owned by holdings; the
// targets page's own PUT/DELETE …/remove are form actions on targets/+page.
export const DELETE: RequestHandler = (event) => deleteTargetAlert(event, event.params.id);
