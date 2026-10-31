// Port of the HTTP side of norviq-web internal/handlers/simulator.go. The
// simulator is deliberately ungated (server.go): it is the one surface a
// visitor with no holdings can actually use.
import type { RequestEvent } from '@sveltejs/kit';
import { apiJSON } from '#lib/server/api.js';
import { portfolioAPIErrorMessage } from '#lib/features/dashboard/goals/form.server.js';
import type {
	PortfolioSimulation,
	PortfolioSimulationListResponse,
	PortfolioSimulationResult
} from './types.js';
import {
	addLeg,
	isOverAllocated,
	maxSimulatorRows,
	newDraft,
	parseSimulatorForm,
	simulatorResultViewModel,
	simulatorUpsertRequest,
	type PageViewModel,
	type SimulatorActionData
} from './vm.js';

const simulationsBase = '/v1/portfolio/simulations';

/** loadSimulatorViewModel: saved simulations and portfolios, fetched together; neither is fatal. */
export async function loadSimulatorViewModel(event: RequestEvent): Promise<PageViewModel> {
	const vm: PageViewModel = {
		draft: newDraft('USD'),
		saved: [],
		result: null,
		error: '',
		notice: '',
		portfolios: [],
		selectedID: '',
		hasPositions: false
	};
	// A failure here is not fatal: the simulator is usable with neither list.
	const [list, page] = await Promise.allSettled([
		apiJSON<PortfolioSimulationListResponse>(event, 'GET', simulationsBase),
		apiJSON<{ items: { id: string; name: string }[] | null }>(event, 'GET', '/v1/portfolios')
	]);
	if (list.status === 'fulfilled') vm.saved = list.value?.items ?? [];
	if (page.status === 'fulfilled')
		vm.portfolios = (page.value?.items ?? []).map((p) => ({ id: p.id, name: p.name }));
	vm.hasPositions = vm.portfolios.length > 0;
	return vm;
}

/** SimulatorPreview */
export async function simulatorPreview(event: RequestEvent): Promise<SimulatorActionData> {
	const vm = await loadSimulatorViewModel(event);
	const form = await event.request.formData();
	const parsed = parseSimulatorForm(form);
	if (parsed.error) {
		vm.error = parsed.error;
		return { vm, scope: 'result' };
	}
	vm.draft = parsed.draft;
	vm.selectedID = parsed.draft.sourcePortfolioId;

	// "Add position" is a submit so the page works without JavaScript; it grows
	// the draft rather than running a simulation.
	if (String(form.get('action') ?? '').trim() === 'add-row') {
		if (vm.draft.legs.length < maxSimulatorRows) addLeg(vm.draft);
		return { vm, scope: 'page' };
	}

	if (isOverAllocated(vm.draft)) {
		vm.error = 'Weights total more than 100%.';
		return { vm, scope: 'result' };
	}

	try {
		const result = await apiJSON<PortfolioSimulationResult>(
			event,
			'POST',
			simulationsBase + '/preview',
			simulatorUpsertRequest(vm.draft)
		);
		vm.result = simulatorResultViewModel(result, vm.draft);
	} catch (err) {
		vm.error = portfolioAPIErrorMessage(err, 'Could not run the simulation.');
	}
	return { vm, scope: 'result' };
}

/** SimulatorSave */
export async function simulatorSave(event: RequestEvent): Promise<SimulatorActionData> {
	const vm = await loadSimulatorViewModel(event);
	const parsed = parseSimulatorForm(await event.request.formData());
	if (parsed.error) {
		vm.error = parsed.error;
		return { vm, scope: 'page' };
	}
	vm.draft = parsed.draft;
	vm.selectedID = parsed.draft.sourcePortfolioId;
	try {
		const saved = await apiJSON<PortfolioSimulation>(
			event,
			'POST',
			simulationsBase,
			simulatorUpsertRequest(vm.draft)
		);
		vm.notice = 'Saved "' + saved.name + '".';
		vm.saved = [saved, ...vm.saved];
	} catch (err) {
		vm.error = portfolioAPIErrorMessage(err, 'Could not save the simulation.');
	}
	return { vm, scope: 'page' };
}
