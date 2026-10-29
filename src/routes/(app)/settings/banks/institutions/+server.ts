import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { apiJSON } from '#lib/server/api.js';
import { requireFeature } from '#lib/server/guards.js';
import { Feature } from '#lib/billing.js';
import type { BankInstitution } from '#lib/features/settings-admin/banks/load.server.js';
import type { BankInstitutionRow } from '#lib/features/settings-admin/banks/types.js';

// SettingsBanksInstitutions: the EU aggregator's institution list for a
// country. Go answered an HTML partial; this answers JSON for
// EuropeanBankPicker. A backend failure is logged and reads as an empty list,
// as in Go.
export const GET: RequestHandler = async (event) => {
	await requireFeature(event, Feature.BankSync, 'Bank sync');
	const country = (event.url.searchParams.get('country') ?? '').trim().toUpperCase() || 'PT';
	let list: BankInstitution[] = [];
	try {
		list = (await apiJSON<BankInstitution[]>(event, 'GET', '/v1/banks/institutions', undefined, { query: { country } })) ?? [];
	} catch (err) {
		console.error('bank institutions', err);
	}
	const institutions: BankInstitutionRow[] = list.map((inst) => ({ id: inst.id, name: inst.name, beta: inst.beta === true }));
	return json({ institutions });
};
