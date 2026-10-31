import { fail, redirect, type RequestEvent } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import type { components } from '#lib/api/schema.js';
import { apiJSON } from '#lib/server/api.js';
import {
	isUUID,
	loadAllocationViewModel
} from '#lib/features/portfolio/analytics/allocation.server.js';

// GET /portfolio/allocation (handlers.PortfolioAllocation) plus the portfolio
// list fragments and mutations (handlers/portfolio_lists.go):
//   GET    /portfolio/allocation/list[/{id}] → PortfolioListPanel, filled from vm.portfolioLists
//   POST   /portfolio/allocation/list        → ?/createList
//   PUT    /portfolio/allocation/list/{id}   → ?/updateList&id= (backend PATCH, as Go)
//   DELETE /portfolio/allocation/list/{id}   → ?/deleteList&id=

type S = components['schemas'];

const LISTS_URL = '/portfolio/allocation?view=lists';

export const load: PageServerLoad = async (event) => {
	const { isPro } = await event.parent();
	return { vm: await loadAllocationViewModel(event, isPro) };
};

/** submitPortfolioList */
async function submitPortfolioList(event: RequestEvent, listID: string) {
	let form: FormData;
	try {
		form = await event.request.formData();
	} catch {
		return fail(400, { listID, listError: 'Invalid form submission.', name: '' });
	}
	const name = String(form.get('name') ?? '').trim();
	if (name === '') return fail(400, { listID, listError: 'Enter a list name.', name });

	const body: S['PortfolioListRequest'] = { name };
	if (listID === '') {
		try {
			await apiJSON<S['PortfolioListResponse']>(event, 'POST', '/v1/portfolio/lists', body);
		} catch {
			return fail(502, { listID, listError: 'Could not create list.', name });
		}
	} else {
		if (!isUUID(listID)) return fail(400, { listID, listError: 'Invalid list.', name });
		try {
			await apiJSON<S['PortfolioListResponse']>(
				event,
				'PATCH',
				`/v1/portfolio/lists/${listID.toLowerCase()}`,
				body
			);
		} catch {
			return fail(502, { listID, listError: 'Could not update list.', name });
		}
	}
	redirect(303, LISTS_URL);
}

export const actions: Actions = {
	/** PortfolioAllocationListCreate */
	createList: (event) => submitPortfolioList(event, ''),

	/** PortfolioAllocationListUpdate */
	updateList: async (event) => {
		const listID = (event.url.searchParams.get('id') ?? '').trim();
		if (listID === '') return fail(400, { listID, listError: 'Missing list', name: '' });
		return submitPortfolioList(event, listID);
	},

	/** PortfolioAllocationListDelete: Go re-rendered the lists panel; the reload does that here. */
	deleteList: async (event) => {
		const listID = (event.url.searchParams.get('id') ?? '').trim();
		if (!isUUID(listID)) return fail(400, { listError: 'Invalid list' });
		try {
			await apiJSON(event, 'DELETE', `/v1/portfolio/lists/${listID.toLowerCase()}`);
		} catch {
			return fail(502, { listError: 'Could not delete list' });
		}
		redirect(303, LISTS_URL);
	}
};
