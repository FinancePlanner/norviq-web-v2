import type { RequestHandler } from './$types';
import { apiFetch } from '#lib/server/api.js';
import { requireFeature } from '#lib/server/guards.js';
import { Feature } from '#lib/billing.js';
import { safeRedirect } from '#lib/helpers.js';
import { formChoice, statusText } from '#lib/features/portfolio/automation/common.server.js';
import { rebalancingBase, rebalancingURL } from '#lib/features/portfolio/automation/rebalancing.server.js';

// GET /portfolio/rebalancing/{id}/plans/{planID}/export.{format} —
// PortfolioRebalancingPlanExport: streams the backend's CSV/PDF through with
// its Content-Type / Content-Disposition / Content-Length.
export const GET: RequestHandler = async (event) => {
	await requireFeature(event, Feature.RebalancingRules, 'Rebalancing rules');
	const portfolioID = event.params.id.trim();
	const planID = event.params.planID.trim();
	const format = formChoice(event.params.format.toLowerCase(), 'csv', 'pdf');
	const path = `${rebalancingBase(portfolioID)}/plans/${encodeURIComponent(planID)}/export.${format}`;
	let upstream: Response;
	try {
		upstream = await apiFetch(event, 'GET', path);
	} catch {
		safeRedirect(303, rebalancingURL(portfolioID, 'Could not export the plan.', true));
	}
	if (!upstream.ok) {
		// DoRaw's APIError reason is the raw response body.
		const body = (await upstream.text().catch(() => '')).trim();
		const message = body || statusText(upstream.status);
		safeRedirect(
			303,
			rebalancingURL(portfolioID, message && message !== statusText(500) ? message : 'Could not export the plan.', true)
		);
	}
	const headers = new Headers();
	for (const name of ['Content-Type', 'Content-Disposition', 'Content-Length']) {
		const value = upstream.headers.get(name);
		if (value) headers.set(name, value);
	}
	return new Response(upstream.body, { status: upstream.status, headers });
};
