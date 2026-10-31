// Port of norviq-web internal/handlers/reports_advanced.go: the reporting
// center (templates, schedules, generated files) and its three POST forms.
// The Go handlers call these routes by hand (DoJSON), so this does too.

import { redirect, type RequestEvent } from '@sveltejs/kit';
import { apiJSON } from '#lib/server/api.js';
import {
	formChoice,
	portfolioAPIErrorMessage,
	type PortfolioPage
} from '#lib/features/portfolio/workspace/api.server.js';
import type {
	AdvancedReportRun,
	AdvancedReportSchedule,
	AdvancedReportTemplate,
	AdvancedViewModel,
	ReportArtifactLink,
	ReportBlock,
	ReportBlockSettings,
	ReportScheduleInput,
	ReportTemplateInput
} from './types.js';

export async function loadAdvancedReports(
	event: RequestEvent,
	isPro: boolean
): Promise<AdvancedViewModel> {
	const q = event.url.searchParams;
	const vm: AdvancedViewModel = {
		templates: [],
		schedules: [],
		runs: [],
		portfolios: [],
		notice: q.get('notice') ?? '',
		error: q.get('error') ?? '',
		isPro
	};
	// Go fetched these one after another and listed every failure in order.
	const get = <T>(path: string, label: string) =>
		apiJSON<{ items?: T[] | null }>(event, 'GET', path).then(
			(page) => ({ items: page?.items ?? [], err: '' }),
			(err: unknown) => ({ items: [] as T[], err: portfolioAPIErrorMessage(err, label) })
		);
	const [templates, schedules, runs, portfolios] = await Promise.all([
		get<AdvancedReportTemplate>('/v1/reporting/templates', 'templates'),
		get<AdvancedReportSchedule>('/v1/reporting/schedules', 'schedules'),
		get<AdvancedReportRun>('/v1/reporting/runs', 'history'),
		get<PortfolioPage['items'][number]>('/v1/portfolios', 'portfolios')
	]);
	vm.templates = templates.items;
	vm.schedules = schedules.items;
	vm.runs = runs.items;
	vm.portfolios = portfolios.items.map((p) => ({ id: p.id, name: p.name, mode: p.mode }));
	const errors = [templates.err, schedules.err, runs.err, portfolios.err].filter(Boolean);
	if (!vm.error && errors.length > 0)
		vm.error = 'Some reporting data could not be loaded: ' + errors.join(', ');
	return vm;
}

/** redirectAdvancedReports: back to the center with ?notice / ?error (url.Values order: sorted keys). */
function redirectAdvancedReports(notice: string, errorMessage: string): never {
	const query = new URLSearchParams();
	if (errorMessage) query.set('error', errorMessage);
	if (notice) query.set('notice', notice);
	const encoded = query.toString();
	redirect(303, '/reports/advanced' + (encoded ? '?' + encoded : ''));
}

const defaultReportBlockSettings = (): ReportBlockSettings => ({
	visualization: 'automatic',
	showLegend: true,
	showDetails: true,
	showSourceURLs: true
});

function reportBlockTitle(kind: string): string {
	const titles: Record<string, string> = {
		key_metrics: 'Key metrics',
		holdings: 'Holdings',
		allocation: 'Allocation',
		performance: 'Performance',
		retirement_forecast: 'Retirement forecast',
		hypothetical_comparison: 'What-if comparison'
	};
	return titles[kind] || 'Report section';
}

const formValues = (form: FormData, name: string) =>
	form.getAll(name).filter((v): v is string => typeof v === 'string');
const nonEmptyFormValues = (values: string[]) =>
	values.map((v) => v.trim()).filter((v) => v !== '');
const formValue = (form: FormData, name: string) => {
	const v = form.get(name);
	return typeof v === 'string' ? v : '';
};

function reportFormats(values: string[]): string[] {
	const formats: string[] = [];
	for (const v of values)
		if ((v === 'pdf' || v === 'xlsx') && !formats.includes(v)) formats.push(v);
	return formats;
}

const uuid = () => crypto.randomUUID();

export async function createTemplate(event: RequestEvent) {
	const form = await event.request.formData();
	const portfolioIDs = nonEmptyFormValues(formValues(form, 'portfolio'));
	const name = formValue(form, 'name').trim();
	const blocks: ReportBlock[] = [
		{
			id: uuid(),
			kind: 'cover',
			title: name,
			portfolioIds: portfolioIDs,
			settings: defaultReportBlockSettings(),
			isVisible: true,
			pageBreakBefore: false
		}
	];
	for (const kind of nonEmptyFormValues(formValues(form, 'block'))) {
		blocks.push({
			id: uuid(),
			kind,
			title: reportBlockTitle(kind),
			portfolioIds: portfolioIDs,
			settings: defaultReportBlockSettings(),
			isVisible: true,
			pageBreakBefore: false
		});
	}
	const description = formValue(form, 'description').trim();
	const input: ReportTemplateInput = {
		name,
		...(description ? { description } : {}),
		theme: formChoice(form.get('theme'), 'norviq_light', 'midnight', 'advisor'),
		pageSettings: {
			size: formChoice(form.get('page'), 'a4', 'letter'),
			orientation: 'portrait',
			showPageNumbers: true,
			showGeneratedAt: true
		},
		blocks
	};
	try {
		await apiJSON(event, 'POST', '/v1/reporting/templates', input);
	} catch (err) {
		redirectAdvancedReports('', portfolioAPIErrorMessage(err, 'Could not create template.'));
	}
	redirectAdvancedReports('Template created.', '');
}

export async function createRun(event: RequestEvent) {
	const form = await event.request.formData();
	let formats = reportFormats(formValues(form, 'format'));
	if (formats.length === 0) formats = ['pdf'];
	const input = {
		templateId: formValue(form, 'template').trim(),
		outputFormats: formats,
		recipientUserIds: [] as string[]
	};
	try {
		await apiJSON(event, 'POST', '/v1/reporting/runs', input);
	} catch (err) {
		redirectAdvancedReports('', portfolioAPIErrorMessage(err, 'Could not queue report.'));
	}
	redirectAdvancedReports('Report queued. Refresh to see generated files.', '');
}

export async function createSchedule(event: RequestEvent) {
	const form = await event.request.formData();
	let formats = reportFormats(formValues(form, 'format'));
	if (formats.length === 0) formats = ['pdf'];
	const input: ReportScheduleInput = {
		name: formValue(form, 'name').trim(),
		templateId: formValue(form, 'template').trim(),
		outputFormats: formats,
		recipientUserIds: [],
		isEnabled: true,
		recurrence: {
			frequency: formChoice(form.get('frequency'), 'monthly', 'weekly', 'quarterly', 'yearly'),
			// Go used the pod's zone unless it was "Local" (the cluster default),
			// in which case Europe/Lisbon. A Worker has no zone of its own.
			timeZone: 'Europe/Lisbon',
			// Kept from Go: the time input is free-form, but only these four survive.
			localTime: formChoice(form.get('time'), '08:00', '09:00', '12:00', '18:00'),
			dayOfMonth: 1,
			weekday: 2
		}
	};
	try {
		await apiJSON(event, 'POST', '/v1/reporting/schedules', input);
	} catch (err) {
		redirectAdvancedReports('', portfolioAPIErrorMessage(err, 'Could not create schedule.'));
	}
	redirectAdvancedReports('Schedule created.', '');
}

/** AdvancedReportArtifact: trade the artifact id for a signed, expiring link and send the browser there. */
export async function artifactRedirect(event: RequestEvent, id: string): Promise<never> {
	let link: ReportArtifactLink;
	try {
		link = await apiJSON<ReportArtifactLink>(
			event,
			'GET',
			'/v1/reporting/artifacts/' + encodeURIComponent(id.trim()) + '/link'
		);
	} catch (err) {
		redirectAdvancedReports('', portfolioAPIErrorMessage(err, 'Could not create download link.'));
	}
	let parsed: URL | null = null;
	try {
		parsed = new URL(link.url);
	} catch {
		parsed = null;
	}
	if (!parsed || (parsed.protocol !== 'https:' && parsed.protocol !== 'http:'))
		redirectAdvancedReports('', 'The download link is invalid.');
	redirect(303, parsed.toString(), { external: true });
}
