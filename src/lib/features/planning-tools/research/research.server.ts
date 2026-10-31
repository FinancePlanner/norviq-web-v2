import { fail, redirect, type RequestEvent } from '@sveltejs/kit';
import { apiFetch, apiJSON, isAPIError } from '#lib/server/api.js';
import { formatFloat } from '#lib/format.js';
import type {
	MemoMarkRow,
	MemoPageVM,
	MemoRow,
	NoteRow,
	PositionMemoCard,
	ResearchPageVM
} from './types.js';

// Port of norviq-web internal/handlers/{research,research_data,position_memos}.go
// and internal/api/position_memos.go.

interface ResearchNoteResponse {
	id: string;
	symbol: string;
	thesis: string;
	title?: string | null;
	risks?: string | null;
	catalysts?: string | null;
}

interface PositionMemoListItem {
	id: string;
	askedSymbol: string;
	primarySymbol: string;
	title: string;
	verdict: string;
	bookmarked: boolean;
	createdAt: string;
}

interface PositionMemoMark {
	cost?: number | null;
	costCurrency?: string | null;
	costSource?: string;
	liveSymbol?: string | null;
	livePrice?: number | null;
	liveCurrency?: string | null;
	primarySymbol?: string | null;
	primaryPrice?: number | null;
	primaryCurrency?: string | null;
	fxPair?: string | null;
	fxRate?: number | null;
	fxDate?: string | null;
	priceInCostCurrency?: number | null;
	drawdownPercent?: number | null;
	statedPercent?: number | null;
	priceImpliedByStatedPercent?: number | null;
	breakevenPercent?: number | null;
	shares?: number | null;
}

interface PositionMemoDetail {
	id: string;
	askedSymbol: string;
	primarySymbol: string;
	title: string;
	mark: PositionMemoMark | null;
	sections: { heading: string; paragraphs: string[] | null }[] | null;
	verdict: string;
	sources:
		{ label: string; symbol?: string | null; asOf?: string | null; url?: string | null }[] | null;
	footer: string;
	bookmarked: boolean;
	createdAt: string;
}

const UUID = /^[0-9a-f]{8}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{12}$/i;

/** uuid.Parse, normalised to the lower-case hyphenated form Go's id.String() sends. */
export function parseUUID(raw: string | undefined | null): string | null {
	const s = (raw ?? '').trim();
	if (!UUID.test(s)) return null;
	const hex = s.replaceAll('-', '').toLowerCase();
	return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function mapResearchNote(note: ResearchNoteResponse): NoteRow {
	const row: NoteRow = {
		id: String(note.id).toLowerCase(),
		symbol: note.symbol.toUpperCase(),
		thesis: note.thesis.trim(),
		title: (note.title ?? '').trim(),
		risks: (note.risks ?? '').trim(),
		catalyst: (note.catalysts ?? '').trim()
	};
	if (row.title === '') row.title = row.symbol + ' thesis';
	return row;
}

/** LoadResearchViewModel */
export async function loadResearchViewModel(
	event: RequestEvent,
	filterSymbol: string
): Promise<ResearchPageVM> {
	const vm: ResearchPageVM = {
		notes: [],
		errorMessage: '',
		successMessage: '',
		filterSymbol: filterSymbol.trim().toUpperCase(),
		savedMemos: []
	};
	try {
		const notes = await apiJSON<ResearchNoteResponse[]>(event, 'GET', '/v1/research', undefined, {
			query: { symbol: vm.filterSymbol || undefined }
		});
		vm.notes = (notes ?? []).map(mapResearchNote);
	} catch (err) {
		console.warn('research list fetch failed', err);
		vm.errorMessage = 'Could not load research notes.';
	}
	return vm;
}

/** memoDate: RFC 3339 → "2 Jan 2006" (Go used the server's zone; the cluster runs UTC). */
export function memoDate(raw: string): string {
	const d = new Date(raw);
	if (!raw || Number.isNaN(d.getTime()) || !/^\d{4}-\d{2}-\d{2}T/.test(raw)) return raw;
	const months = [
		'Jan',
		'Feb',
		'Mar',
		'Apr',
		'May',
		'Jun',
		'Jul',
		'Aug',
		'Sep',
		'Oct',
		'Nov',
		'Dec'
	];
	return `${d.getUTCDate()} ${months[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

/** loadSavedMemos: a failure (including the Pro gate) leaves the list empty. */
export async function loadSavedMemos(event: RequestEvent): Promise<MemoRow[]> {
	try {
		const items = await apiJSON<PositionMemoListItem[]>(event, 'GET', '/v1/ai/memos', undefined, {
			query: { bookmarked: 'true' }
		});
		return (items ?? []).map((item) => ({
			id: item.id,
			symbol: item.primarySymbol,
			title: item.title,
			verdict: item.verdict,
			createdAt: memoDate(item.createdAt)
		}));
	} catch (err) {
		console.warn('saved memos fetch failed', err);
		return [];
	}
}

/** ResearchSubmit: the default action of /research. */
export async function submitResearch(event: RequestEvent) {
	let form: FormData;
	try {
		form = await event.request.formData();
	} catch {
		return fail(400, { error: 'Invalid form submission.' });
	}
	const get = (k: string) => String(form.get(k) ?? '').trim();
	const symbol = get('symbol').toUpperCase();
	const thesis = get('thesis');
	if (symbol === '' || thesis === '')
		return fail(400, { error: 'Symbol and thesis are required.' });
	const body: Record<string, string> = { symbol, thesis };
	const title = get('title');
	const risks = get('risks');
	const catalysts = get('catalysts');
	if (title) body.title = title;
	if (risks) body.risks = risks;
	if (catalysts) body.catalysts = catalysts;
	try {
		await apiJSON(event, 'POST', '/v1/research', body);
	} catch (err) {
		console.warn('create research note failed', err);
		return fail(400, { error: 'Could not save research note.' });
	}
	redirect(303, '/research?saved=1');
}

/** ResearchDelete: POST /research/{id}/delete (path id, else the form's id). */
export async function deleteResearch(event: RequestEvent): Promise<Response> {
	let id = ((event.params as { id?: string }).id ?? '').trim();
	if (id === '') {
		try {
			id = String((await event.request.formData()).get('id') ?? '').trim();
		} catch {
			/* no form */
		}
	}
	if (id === '') return new Response('Invalid delete request\n', { status: 400 });
	const noteID = parseUUID(id);
	if (!noteID) return new Response('Invalid note ID\n', { status: 400 });
	const res = await apiFetch(event, 'DELETE', `/v1/research/${noteID}`).catch(() => null);
	if (!res || (res.status !== 204 && res.status !== 200))
		return new Response('Could not delete note\n', { status: 502 });
	redirect(303, '/research');
}

// ---------------------------------------------------------------------------
// Position memos

export class MemoNotFoundError extends Error {}

function memoMoney(value: number, currency: string): string {
	switch (currency.toUpperCase()) {
		case 'EUR':
			return '€' + formatFloat(value, 2);
		case 'USD':
			return '$' + formatFloat(value, 2);
		case '':
			return formatFloat(value, 2);
		default:
			return formatFloat(value, 2) + ' ' + currency.toUpperCase();
	}
}

function memoPercent(value: number): string {
	return (value >= 0 ? '+' : '') + formatFloat(value, 1) + '%';
}

const s = (v: string | null | undefined) => (v ?? '').trim();

function memoMarkRows(mark: PositionMemoMark | null): MemoMarkRow[] {
	const rows: MemoMarkRow[] = [];
	if (!mark) return rows;
	const costCurrency = s(mark.costCurrency);
	if (mark.cost != null) {
		const source = mark.costSource === 'stated' ? 'as you stated it' : 'from your saved lots';
		rows.push({ label: 'Your cost', value: memoMoney(mark.cost, costCurrency) + ' · ' + source });
	}
	if (mark.shares != null) rows.push({ label: 'Shares', value: String(mark.shares) });
	if (mark.livePrice != null)
		rows.push({
			label: 'Live price ' + s(mark.liveSymbol),
			value: memoMoney(mark.livePrice, s(mark.liveCurrency))
		});
	if (mark.primaryPrice != null && s(mark.primarySymbol) !== s(mark.liveSymbol)) {
		rows.push({
			label: 'Primary listing ' + s(mark.primarySymbol),
			value: memoMoney(mark.primaryPrice, s(mark.primaryCurrency))
		});
	}
	if (mark.fxRate != null) {
		let value = `${s(mark.fxPair)} ${formatFloat(mark.fxRate, 4)}`;
		const date = s(mark.fxDate);
		if (date) value += ' · ' + date;
		rows.push({ label: 'FX rate', value: value.trim() });
		if (mark.priceInCostCurrency != null)
			rows.push({
				label: 'Live price in ' + costCurrency,
				value: memoMoney(mark.priceInCostCurrency, costCurrency)
			});
	}
	if (mark.drawdownPercent != null)
		rows.push({ label: 'Versus your cost', value: memoPercent(mark.drawdownPercent) });
	if (mark.statedPercent != null) {
		let value = memoPercent(mark.statedPercent) + ' as you stated it';
		if (mark.priceImpliedByStatedPercent != null)
			value += ' · implies ' + memoMoney(mark.priceImpliedByStatedPercent, costCurrency);
		rows.push({ label: 'Stated move', value });
	}
	if (mark.breakevenPercent != null)
		rows.push({ label: 'Gain needed to reach cost', value: memoPercent(mark.breakevenPercent) });
	return rows;
}

/** doMemoRequest: 404 → MemoNotFoundError, other non-2xx → Error. */
async function memoRequest<T>(
	event: RequestEvent,
	method: string,
	path: string,
	body?: unknown
): Promise<T> {
	try {
		return await apiJSON<T>(event, method, path, body);
	} catch (err) {
		if (isAPIError(err) && err.status === 404)
			throw new MemoNotFoundError('position memo not found');
		throw err;
	}
}

/** LoadMemoPageViewModel: formats the server mark; recomputes nothing. */
export async function loadMemoPage(event: RequestEvent, id: string): Promise<MemoPageVM> {
	const detail = await memoRequest<PositionMemoDetail>(event, 'GET', `/v1/ai/memos/${id}`);
	const vm: MemoPageVM = {
		id: detail.id,
		symbol: detail.primarySymbol,
		title: detail.title,
		createdAt: memoDate(detail.createdAt),
		mark: memoMarkRows(detail.mark),
		sections: (detail.sections ?? []).map((sec) => ({
			heading: sec.heading,
			paragraphs: sec.paragraphs ?? []
		})),
		verdict: detail.verdict,
		footer: detail.footer,
		sources: [],
		bookmarked: detail.bookmarked
	};
	if (
		detail.askedSymbol &&
		detail.askedSymbol.toLowerCase() !== detail.primarySymbol.toLowerCase()
	) {
		vm.symbol = detail.askedSymbol + ' / ' + detail.primarySymbol;
	}
	for (const source of detail.sources ?? []) {
		const meta: string[] = [];
		if (source.symbol) meta.push(source.symbol);
		if (source.asOf) meta.push('as of ' + source.asOf);
		const url =
			source.url && (source.url.startsWith('https://') || source.url.startsWith('http://'))
				? source.url
				: '';
		vm.sources.push({ label: source.label, meta: meta.join(' · '), url });
	}
	return vm;
}

export async function bookmarkMemo(
	event: RequestEvent,
	id: string,
	bookmarked: boolean
): Promise<PositionMemoCard> {
	return memoRequest<PositionMemoCard>(event, 'POST', `/v1/ai/memos/${id}/bookmark`, {
		bookmarked
	});
}

/** DeletePositionMemo: a 404 is the outcome asked for. */
export async function deleteMemo(event: RequestEvent, id: string): Promise<void> {
	try {
		await memoRequest(event, 'DELETE', `/v1/ai/memos/${id}`);
	} catch (err) {
		if (!(err instanceof MemoNotFoundError)) throw err;
	}
}
