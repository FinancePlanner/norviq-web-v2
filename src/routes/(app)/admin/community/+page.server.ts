import { error, fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { isAPIError } from '#lib/server/api.js';
import {
	boardNotice,
	reportRow,
	sanctionRow,
	type CreateSanctionRequest
} from '#lib/features/settings-admin/admin/boards-admin.js';
import {
	adminCreateSanction,
	adminListBoardReports,
	adminListSanctions,
	adminResolveBoardReport,
	adminRevokeSanction,
	boardsErrorText,
	boardsFailure
} from '#lib/features/settings-admin/admin/boards-admin.server.js';

// Port of norviq-web handlers.BoardsAdmin* (internal/handlers/boards.go).
// There is no admin middleware: the backend enforces its admin allowlist, and
// a 403 on the sanctions list renders a plain 404 so the page does not exist
// for anyone else. Go's POST /admin/community/sanctions,
// /sanctions/{id}/revoke and /reports/{id}/resolve are the ?/sanction,
// ?/revoke and ?/resolve actions here.
export const load: PageServerLoad = async (event) => {
	let sanctions;
	try {
		sanctions = await adminListSanctions(event);
	} catch (err) {
		if (isAPIError(err) && err.status === 403) error(404, 'Not Found');
		boardsFailure(err, 'moderation');
	}
	let reports;
	try {
		reports = await adminListBoardReports(event);
	} catch (err) {
		boardsFailure(err, 'moderation');
	}
	const now = new Date();
	return {
		notice: boardNotice(event.url.searchParams.get('notice')),
		username: event.url.searchParams.get('username') ?? '',
		sanctions: sanctions.map((s) => sanctionRow(s, now)),
		reports: reports.map((r) => reportRow(r, now))
	};
};

const formString = (form: FormData, key: string) => String(form.get(key) ?? '');

export const actions: Actions = {
	sanction: async (event) => {
		const form = await event.request.formData();
		const req: CreateSanctionRequest = {
			username: formString(form, 'username').trim().replace(/^@/, ''),
			kind: formString(form, 'kind'),
			reason: formString(form, 'reason').trim(),
			durationHours: null
		};
		const raw = formString(form, 'duration_hours');
		if (/^[+-]?\d+$/.test(raw)) {
			const hours = Number.parseInt(raw, 10);
			if (hours > 0) req.durationHours = hours;
		}
		try {
			await adminCreateSanction(event, req);
		} catch (err) {
			return fail(422, { error: boardsErrorText(err), username: req.username });
		}
		redirect(303, '/admin/community?notice=sanctioned');
	},
	revoke: async (event) => {
		const id = formString(await event.request.formData(), 'id');
		try {
			await adminRevokeSanction(event, id);
		} catch (err) {
			boardsFailure(err, 'sanction');
		}
		redirect(303, '/admin/community?notice=lifted');
	},
	resolve: async (event) => {
		const id = formString(await event.request.formData(), 'id');
		try {
			await adminResolveBoardReport(event, id);
		} catch (err) {
			boardsFailure(err, 'report');
		}
		redirect(303, '/admin/community?notice=resolved');
	}
};
