import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import type { components } from '#lib/api/schema.js';
import { apiJSON, isAPIError } from '#lib/server/api.js';
import { parseUUID, uuidString } from '#lib/features/portfolio/market.server.js';
import { loadWatchlistViewModel, processWatchlistCSVUpload } from '#lib/features/portfolio/watchlist/watchlist.server.js';

// GET /portfolio/watchlist (handlers.PortfolioWatchlist) plus the watchlist
// mutations that were HTMX posts against sibling URLs:
//   POST   /portfolio/watchlist/items            → ?/add
//   PATCH  /portfolio/watchlist/items/{id}       → ?/updateNote
//   POST   /portfolio/watchlist/list             → ?/createList
//   PUT    /portfolio/watchlist/list/{id}        → ?/updateList
//   DELETE /portfolio/watchlist/list/{id}        → ?/deleteList
//   POST   /portfolio/watchlist/import/csv/*     → ?/csvPreview, ?/csvCommit
// DELETE /portfolio/watchlist/items/{id} is a fetch to /api/v1/watchlist/{id}.

type Schemas = components['schemas'];

export const load: PageServerLoad = async (event) => {
	const vm = await loadWatchlistViewModel(event, event.url.searchParams.get('list') ?? '');
	return { vm };
};

const str = (form: FormData, key: string) => String(form.get(key) ?? '').trim();

/** submitWatchlistList: create or rename a theme, then land on it. */
async function submitWatchlistList(event: Parameters<Actions[string]>[0], listID: string) {
	let form: FormData;
	try {
		form = await event.request.formData();
	} catch {
		return fail(400, { listID, listError: 'Invalid form submission.', name: '' });
	}
	const name = str(form, 'name');
	if (name === '') return fail(400, { listID, listError: 'Enter a list name.', name });

	let redirectListID: string;
	if (listID === '') {
		try {
			const created = await apiJSON<Schemas['WatchlistListResponse']>(event, 'POST', '/v1/watchlist/lists', { name });
			redirectListID = uuidString(created.id);
		} catch {
			return fail(502, { listID, listError: 'Could not create list.', name });
		}
	} else {
		const parsed = parseUUID(listID);
		if (!parsed) return fail(400, { listID, listError: 'Invalid list.', name });
		try {
			const updated = await apiJSON<Schemas['WatchlistListResponse']>(event, 'PATCH', `/v1/watchlist/lists/${parsed}`, { name });
			redirectListID = uuidString(updated.id);
		} catch {
			return fail(502, { listID, listError: 'Could not update list.', name });
		}
	}
	redirect(303, '/portfolio/watchlist?list=' + redirectListID);
}

export const actions: Actions = {
	/** PortfolioWatchlistAdd */
	add: async (event) => {
		const form = await event.request.formData().catch(() => null);
		if (!form) return fail(400, { addError: 'Invalid form' });
		const symbol = str(form, 'symbol').toUpperCase();
		const listID = str(form, 'list_id');
		if (symbol === '') return fail(400, { addError: 'Symbol is required' });
		const req: Schemas['WatchlistItemRequest'] = { symbol };
		const parsed = parseUUID(listID);
		if (listID !== '' && parsed) req.watchlistListId = parsed;
		try {
			await apiJSON(event, 'POST', '/v1/watchlist', req);
		} catch (err) {
			console.warn('create watchlist item failed', isAPIError(err) ? err.status : err);
			return fail(502, { addError: 'Failed to add symbol' });
		}
		return { added: true };
	},

	/** PortfolioWatchlistItemUpdate */
	updateNote: async (event) => {
		const form = await event.request.formData().catch(() => null);
		if (!form) return fail(400, { noteError: 'Invalid form' });
		const itemID = parseUUID(str(form, 'item_id'));
		if (!itemID) return fail(400, { noteError: 'Invalid watchlist item' });
		const note = str(form, 'note');
		try {
			await apiJSON(event, 'PATCH', `/v1/watchlist/${itemID}`, { note });
		} catch (err) {
			console.warn('update watchlist item failed', isAPIError(err) ? err.status : err);
			return fail(502, { noteError: 'Could not update watchlist item' });
		}
		return { noteSaved: true };
	},

	/** PortfolioWatchlistListCreate */
	createList: (event) => submitWatchlistList(event, ''),

	/** PortfolioWatchlistListUpdate */
	updateList: async (event) => {
		const listID = (event.url.searchParams.get('id') ?? '').trim();
		if (listID === '') return fail(400, { listID, listError: 'Missing list', name: '' });
		return submitWatchlistList(event, listID);
	},

	/** PortfolioWatchlistListDelete */
	deleteList: async (event) => {
		const listID = parseUUID(event.url.searchParams.get('id'));
		if (!listID) return fail(400, { listError: 'Invalid list' });
		try {
			await apiJSON(event, 'DELETE', `/v1/watchlist/lists/${listID}`);
		} catch {
			return fail(502, { listError: 'Could not delete list' });
		}
		redirect(303, '/portfolio/watchlist');
	},

	/** PortfolioWatchlistCSVImportPreview */
	csvPreview: async (event) => ({ csv: await processWatchlistCSVUpload(event, false) }),

	/** PortfolioWatchlistCSVImportCommit */
	csvCommit: async (event) => ({ csv: await processWatchlistCSVUpload(event, true) })
};
