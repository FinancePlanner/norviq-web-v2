import { json, type RequestHandler } from '@sveltejs/kit';
import { loadAssetSearchResults } from '#lib/features/dashboard/panels/load.server.js';

// GET /dashboard/search?q= — AppHandler.DashboardSearch. JSON results (search +
// period returns, aggregated server-side as in Go) for the AssetSearch combobox.
export const GET: RequestHandler = async (event) => {
	const query = (event.url.searchParams.get('q') ?? '').trim();
	const results = await loadAssetSearchResults(event, query, true);
	return json({ query, results }, { headers: { 'Cache-Control': 'private, no-store' } });
};
