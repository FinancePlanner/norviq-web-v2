import { error, type RequestEvent } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { apiJSON } from '#lib/server/api.js';
import { requireFeature } from '#lib/server/guards.js';
import { loadBillingContext } from '#lib/server/app-context.js';
import { Feature, isPro } from '#lib/billing.js';
import { safeRedirect } from '#lib/helpers.js';
import {
	encodeQuery,
	escapePath,
	formChoice,
	formValue,
	parseFloatGo,
	portfolioAPIErrorMessage,
	type ManagedPortfolio,
	type PortfolioCashPosition,
	type PortfolioInvitation,
	type PortfolioMember,
	type PortfolioPage
} from '#lib/features/portfolio/workspace/api.server.js';
import { pilotFollowingByPortfolio, pilotsEnabled } from '#lib/features/portfolio/workspace/pilots.server.js';
import { goTimeFormat } from '#lib/features/portfolio/workspace/dates.js';

// handlers/portfolio_workspace.go — GET /portfolios and its POST forms.

export const load: PageServerLoad = async (event) => {
	const q = event.url.searchParams;
	const [billing, pilotsOn] = await Promise.all([loadBillingContext(event), pilotsEnabled(event)]);
	const vm = {
		notice: q.get('notice') ?? '',
		error: q.get('error') ?? '',
		isPro: isPro(billing),
		pilotsEnabled: pilotsOn,
		portfolios: [] as ManagedPortfolio[],
		selected: null as ManagedPortfolio | null,
		members: [] as PortfolioMember[],
		invitations: [] as PortfolioInvitation[],
		cash: [] as PortfolioCashPosition[],
		pilotFollows: null as Awaited<ReturnType<typeof pilotFollowingByPortfolio>>
	};
	let page: PortfolioPage;
	try {
		page = await apiJSON<PortfolioPage>(event, 'GET', '/v1/portfolios');
	} catch (err) {
		vm.error = portfolioAPIErrorMessage(err, 'Could not load portfolios.');
		return vm;
	}
	vm.portfolios = page.items ?? [];
	vm.pilotFollows = await pilotFollowingByPortfolio(event, pilotsOn);
	let selectedID = (q.get('portfolio') ?? '').trim();
	if (selectedID === '' && vm.portfolios.length > 0) selectedID = vm.portfolios[0].id;
	vm.selected = vm.portfolios.find((p) => p.id === selectedID) ?? null;
	if (vm.selected) {
		const base = '/v1/portfolios/' + escapePath(vm.selected.id);
		const quiet = <T>(path: string, fallback: T) => apiJSON<T>(event, 'GET', path).catch(() => fallback);
		const [members, cash, invitations] = await Promise.all([
			quiet<PortfolioMember[]>(base + '/members', []),
			quiet<PortfolioCashPosition[]>(base + '/cash', []),
			vm.selected.capabilities?.canManageMembers ? quiet<PortfolioInvitation[]>(base + '/invitations', []) : Promise.resolve([])
		]);
		vm.members = members ?? [];
		vm.cash = cash ?? [];
		vm.invitations = invitations ?? [];
	}
	return vm;
};

// redirectPortfolioWorkspace: "could not / invalid / requires / limit" reads
// as an error, everything else as a notice.
function redirectWorkspace(portfolioID: string, message: string): never {
	const values: Record<string, string> = {};
	if (portfolioID) values.portfolio = portfolioID;
	const lower = message.toLowerCase();
	if (['could not', 'invalid', 'requires', 'limit'].some((w) => lower.includes(w))) values.error = message;
	else values.notice = message;
	const encoded = encodeQuery(values);
	safeRedirect(303, '/portfolios' + (encoded ? '?' + encoded : ''));
}

async function formData(event: RequestEvent): Promise<FormData> {
	try {
		return await event.request.formData();
	} catch {
		error(400, 'Invalid form submission');
	}
}

const portfolioID = (form: FormData) => formValue(form, 'id').trim();

export const actions: Actions = {
	// POST /portfolios
	create: async (event) => {
		const form = await formData(event);
		const purpose = formChoice(form.get('purpose'), 'personal', 'retirement');
		const ownership = formChoice(form.get('ownership'), 'individual', 'joint');
		const mode = formChoice(form.get('mode'), 'actual', 'hypothetical');
		const freePersonal = purpose === 'personal' && ownership === 'individual' && mode === 'actual';
		if (!freePersonal && !isPro(await loadBillingContext(event))) {
			error(402, { message: 'Extra portfolios', proGate: 'Extra portfolios' });
		}
		const input = {
			name: formValue(form, 'name').trim(),
			purpose,
			ownership,
			mode,
			baseCurrency: formValue(form, 'currency').trim().toUpperCase(),
			copyRetirementPlan: false
		};
		let created: ManagedPortfolio;
		try {
			created = await apiJSON<ManagedPortfolio>(event, 'POST', '/v1/portfolios', input);
		} catch (err) {
			redirectWorkspace('', portfolioAPIErrorMessage(err, 'Could not create portfolio.'));
		}
		redirectWorkspace(created.id, 'Portfolio created.');
	},

	// POST /portfolios/{id}/clone (requireAdvancedPortfolios)
	clone: async (event) => {
		await requireFeature(event, Feature.AdvancedPortfolios, 'Extra portfolios');
		const id = portfolioID(await formData(event));
		if (id === '') redirectWorkspace('', 'Invalid portfolio.');
		const input = { name: 'What if - ' + goTimeFormat(new Date(), '2 Jan 2006'), copyRetirementPlan: true };
		let created: ManagedPortfolio;
		try {
			created = await apiJSON<ManagedPortfolio>(event, 'POST', '/v1/portfolios/' + escapePath(id) + '/clone', input);
		} catch (err) {
			redirectWorkspace(id, portfolioAPIErrorMessage(err, 'Could not create sandbox.'));
		}
		redirectWorkspace(created.id, 'What-if portfolio created.');
	},

	// POST /portfolios/{id}/invite (requireJointPortfolios)
	invite: async (event) => {
		await requireFeature(event, Feature.JointPortfolios, 'Joint portfolios');
		const form = await formData(event);
		const id = portfolioID(form);
		const input = { email: formValue(form, 'email').trim().toLowerCase(), role: 'editor' };
		try {
			await apiJSON(event, 'POST', '/v1/portfolios/' + escapePath(id) + '/invitations', input);
		} catch (err) {
			redirectWorkspace(id, portfolioAPIErrorMessage(err, 'Could not send invitation.'));
		}
		redirectWorkspace(id, 'Invitation sent.');
	},

	// POST /portfolios/{id}/cash
	cash: async (event) => {
		const form = await formData(event);
		const id = portfolioID(form);
		const input = {
			label: formValue(form, 'label').trim(),
			currency: formValue(form, 'currency').trim().toUpperCase(),
			balance: parseFloatGo(formValue(form, 'balance')),
			asOf: goTimeFormat(new Date(), '2006-01-02')
		};
		try {
			await apiJSON(event, 'POST', '/v1/portfolios/' + escapePath(id) + '/cash', input);
		} catch (err) {
			redirectWorkspace(id, portfolioAPIErrorMessage(err, 'Could not add cash balance.'));
		}
		redirectWorkspace(id, 'Cash balance added.');
	},

	// POST /portfolios/{id}/archive
	archive: async (event) => {
		const id = portfolioID(await formData(event));
		try {
			await apiJSON(event, 'POST', '/v1/portfolios/' + escapePath(id) + '/archive');
		} catch (err) {
			redirectWorkspace(id, portfolioAPIErrorMessage(err, 'Could not archive portfolio.'));
		}
		redirectWorkspace('', 'Portfolio archived.');
	}
};
