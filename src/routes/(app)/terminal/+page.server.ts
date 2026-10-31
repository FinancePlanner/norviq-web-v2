import type { PageServerLoad } from './$types';
import {
	loadAutobuys,
	loadWorkspace,
	terminalSessionExpired
} from '#lib/features/planning-tools/terminal/terminal.server.js';
import {
	autobuysUnavailable,
	newCreateForm,
	normalizeTerminalTicker,
	TERMINAL_DISCLAIMER,
	TERMINAL_SUBTITLE,
	TERMINAL_TITLE
} from '#lib/features/planning-tools/terminal/vm.js';
import type { TerminalPageVM } from '#lib/features/planning-tools/terminal/types.js';

// GET /terminal (handlers.Terminal). ?ticker=X (the stock page's "Add terminal
// scenario" link) opens the create form with that ticker filled in.
export const load: PageServerLoad = async (event) => {
	const { isPro } = await event.parent();
	const t = event.locals.t;
	const [normalized, ok] = normalizeTerminalTicker(event.url.searchParams.get('ticker'));
	const create = newCreateForm(ok ? normalized : '', crypto.randomUUID());
	const { vm, status } = await loadWorkspace(event, isPro, create);
	if (status === 401) await terminalSessionExpired(event);
	const page: TerminalPageVM = {
		...vm,
		copy: {
			title: t(TERMINAL_TITLE),
			subtitle: t(TERMINAL_SUBTITLE),
			disclaimer: t(TERMINAL_DISCLAIMER)
		},
		autobuys: vm.loadError ? autobuysUnavailable() : await loadAutobuys(event)
	};
	return { vm: page };
};
