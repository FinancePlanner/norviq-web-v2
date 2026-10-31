import type { RequestEvent } from '@sveltejs/kit';
import { apiJSON } from '#lib/server/api.js';
import { config } from '#lib/server/env.js';
import { formatGoDateTime, formatRelativeTime, parseTime } from './go-time.js';
import {
	emptyIBKRVM,
	emptyTelegramVM,
	telegramAlertLabel,
	type BrokerRow,
	type IBKRConnectionVM,
	type IntegrationsViewModel,
	type MCPAgentRow,
	type MCPStatusVM,
	type TelegramAlertRow,
	type TelegramVM
} from './types.js';

// Ports of norviq-web internal/handlers/settings_integrations_data.go,
// dashboard_mcp_status.go (LoadMCPStatusVM) and settings_telegram.go
// (AttachTelegramStatus). Backend shapes follow the Go hand-written clients
// (internal/api/telegram.go, tokens.go) and the generated broker models.

interface BrokerConnectionResponse {
	id: string;
	provider: string;
	status: string;
	displayName?: string | null;
	statusDetail?: string | null;
	lastSyncedAt?: string | null;
	connectedAt?: string | null;
}

interface PersonalAccessToken {
	id: string;
	name: string;
	scopes: string[] | null;
	lastUsedAt?: string | null;
	expiresAt: string;
	createdAt: string;
}

export interface TelegramStatus {
	available: boolean;
	connected: boolean;
	botUsername: string;
	lastSeenAt?: string | null;
	connectedAt?: string | null;
}

export interface TelegramCode {
	code: string;
	expiresAt: string;
	deepLink: string;
}

export interface TelegramPreference {
	kind: string;
	enabled: boolean;
	quietHoursStart?: number | null;
	quietHoursEnd?: number | null;
	timezone?: string;
}

export async function loadIntegrationsVM(
	event: RequestEvent,
	query: URLSearchParams | null
): Promise<IntegrationsViewModel> {
	const vm: IntegrationsViewModel = {
		brokers: [],
		ibkr: emptyIBKRVM(),
		mcp: emptyMCPStatus(false),
		telegram: emptyTelegramVM(),
		appStoreURL: config().iosAppStoreURL,
		hasLoadError: false,
		errorMessage: '',
		successMessage: ''
	};
	applyIntegrationsFlash(vm, query);

	let brokers: BrokerConnectionResponse[];
	try {
		brokers = (await apiJSON<BrokerConnectionResponse[]>(event, 'GET', '/v1/brokers')) ?? [];
	} catch (err) {
		console.warn('list brokers failed', err);
		vm.hasLoadError = true;
		vm.errorMessage = integrationsErrorOrDefault(
			vm.errorMessage,
			'Could not load broker connections.'
		);
		return vm;
	}
	vm.brokers = brokers.map(mapBrokerRow);

	try {
		const ibkr = await apiJSON<BrokerConnectionResponse>(event, 'GET', '/v1/brokers/ibkr');
		if (ibkr) vm.ibkr = mapIBKRConnection(ibkr);
	} catch {
		// No IBKR connection (404) or a failed lookup: the connect form shows.
	}
	return vm;
}

function applyIntegrationsFlash(vm: IntegrationsViewModel, query: URLSearchParams | null) {
	if (!query) return;
	switch ((query.get('import') ?? '').trim().toLowerCase()) {
		case 'csv':
			vm.successMessage = 'CSV imported. Your holdings were added to your portfolio.';
			break;
		case 'manual':
			vm.successMessage = 'Holdings added to your portfolio.';
			break;
	}
	const msg = (query.get('msg') ?? '').trim();
	switch ((query.get('telegram') ?? '').trim().toLowerCase()) {
		case 'disconnected':
			vm.successMessage = 'Telegram disconnected.';
			break;
		case 'alert-on':
			if (msg) vm.successMessage = msg + ' will now reach Telegram.';
			break;
		case 'alert-off':
			if (msg) vm.successMessage = msg + ' will no longer reach Telegram.';
			break;
		case 'error':
			vm.errorMessage = msg || 'Telegram action failed.';
			break;
	}
	switch ((query.get('ibkr') ?? '').trim().toLowerCase()) {
		case 'connected':
			vm.successMessage = 'IBKR connected. Your holdings were imported.';
			break;
		case 'disconnected':
			vm.successMessage = 'IBKR disconnected.';
			break;
		case 'synced':
			vm.successMessage = formatIBKRSyncMessage(
				atoi(query.get('inserted')),
				atoi(query.get('updated')),
				atoi(query.get('removed'))
			);
			break;
		case 'error':
			vm.errorMessage = msg || 'IBKR action failed.';
			break;
	}
}

// strconv.Atoi with the error ignored: anything but a plain integer is 0.
function atoi(raw: string | null): number {
	return raw && /^[+-]?\d+$/.test(raw) ? Number.parseInt(raw, 10) : 0;
}

export function formatIBKRSyncMessage(inserted: number, updated: number, removed: number): string {
	if (inserted === 0 && updated === 0 && removed === 0)
		return 'IBKR sync completed. Holdings are up to date.';
	return [
		'IBKR sync completed.',
		formatSyncCount('added', inserted),
		formatSyncCount('updated', updated),
		formatSyncCount('removed', removed)
	]
		.join(' ')
		.trim();
}

function formatSyncCount(label: string, count: number): string {
	if (count <= 0) return '';
	return `${count} ${count !== 1 ? label + 's' : label}`;
}

function mapIBKRConnection(broker: BrokerConnectionResponse): IBKRConnectionVM {
	const status = (broker.status ?? '').trim();
	const connected = status.toLowerCase() === 'connected';
	const lastSynced = parseTime(broker.lastSyncedAt);
	return {
		hasConnection: true,
		status,
		statusLabel: brokerStatusLabel(status),
		isConnected: connected,
		canSync: connected,
		displayName: (broker.displayName ?? '').trim(),
		statusDetail: (broker.statusDetail ?? '').trim(),
		lastSyncedLabel: lastSynced ? formatGoDateTime(lastSynced) : ''
	};
}

function brokerStatusLabel(status: string): string {
	switch (status.trim().toLowerCase()) {
		case 'connected':
			return 'Connected';
		case 'disconnected':
			return 'Disconnected';
		case 'error':
			return 'Error';
		case 'pending':
			return 'Pending';
		default:
			if (status === '') return 'Unknown';
			return status[0].toUpperCase() + status.slice(1);
	}
}

function integrationsErrorOrDefault(current: string, fallback: string): string {
	return current.trim() !== '' ? current : fallback;
}

function mapBrokerRow(broker: BrokerConnectionResponse): BrokerRow {
	const provider = (broker.provider ?? '').trim();
	let status = (broker.status ?? '').trim();
	const label = providerLabel(provider) || provider;
	if (status === '') status = 'unknown';
	return { provider, status, label };
}

function providerLabel(provider: string): string {
	switch (provider.trim().toLowerCase()) {
		case 'ibkr':
		case 'interactive_brokers':
			return 'Interactive Brokers';
		case 'csv':
			return 'CSV import';
		case 'manual':
			return 'Manual entry';
		default: {
			const p = provider.replaceAll('_', ' ');
			if (p === '') return '';
			return p[0].toUpperCase() + p.slice(1);
		}
	}
}

// ---- MCP status (dashboard_mcp_status.go LoadMCPStatusVM) ----

function emptyMCPStatus(isPro: boolean): MCPStatusVM {
	return {
		isPro,
		hasTokens: false,
		tokenCount: 0,
		liveCount: 0,
		lastActivity: '',
		agenticLabel: 'Agentic status · Standby',
		scopes: [
			{ label: 'Expense tools', state: 'off' },
			{ label: 'Reports / spend', state: 'off' },
			{ label: 'Market / insights', state: 'off' },
			{ label: 'Tax dashboard', state: 'off' }
		],
		agents: [],
		loadError: false,
		needsPro: false,
		empty: false
	};
}

export async function loadMCPStatusVM(event: RequestEvent, isPro: boolean): Promise<MCPStatusVM> {
	const vm = emptyMCPStatus(isPro);
	if (!vm.isPro) {
		vm.needsPro = true;
		vm.empty = true;
		return vm;
	}
	let tokens: PersonalAccessToken[];
	try {
		const envelope = await apiJSON<{ items?: PersonalAccessToken[] | null }>(
			event,
			'GET',
			'/v1/tokens'
		);
		tokens = envelope?.items ?? [];
	} catch (err) {
		console.warn('list PAT for mcp status failed', err);
		vm.loadError = true;
		return vm;
	}
	if (tokens.length === 0) {
		vm.empty = true;
		return vm;
	}

	const now = new Date();
	const liveWindow = 24 * 60 * 60 * 1000;
	const scopeLive = new Set<string>();
	const scopeReady = new Set<string>();
	let newest: Date | null = null;

	for (const t of tokens) {
		vm.hasTokens = true;
		vm.tokenCount++;
		const agent: MCPAgentRow = {
			name: (t.name ?? '').trim() || 'Unnamed token',
			scopes: (t.scopes ?? []).join(', '),
			lastUsed: 'Never',
			status: 'Never',
			isLive: false
		};
		let isLive = false;
		const lastUsed = parseTime(t.lastUsedAt);
		if (lastUsed) {
			agent.lastUsed = formatRelativeTime(lastUsed, now);
			if (now.getTime() - lastUsed.getTime() <= liveWindow) {
				isLive = true;
				agent.status = 'Live';
				agent.isLive = true;
				vm.liveCount++;
			} else {
				agent.status = 'Idle';
			}
			if (!newest || lastUsed > newest) newest = lastUsed;
		}
		for (const scope of t.scopes ?? []) {
			const fam = scopeFamily(scope);
			if (!fam) continue;
			(isLive ? scopeLive : scopeReady).add(fam);
		}
		vm.agents.push(agent);
	}

	// sort.SliceStable: live first, then by lower-cased name.
	vm.agents.sort((a, b) => {
		if (a.isLive !== b.isLive) return a.isLive ? -1 : 1;
		const an = a.name.toLowerCase();
		const bn = b.name.toLowerCase();
		return an < bn ? -1 : an > bn ? 1 : 0;
	});

	const state = (fam: string) =>
		scopeLive.has(fam) ? 'live' : scopeReady.has(fam) ? 'ready' : 'off';
	vm.scopes = [
		{ label: 'Expense tools', state: state('expenses') },
		{ label: 'Reports / spend', state: state('reports') },
		{ label: 'Market / insights', state: state('market') },
		{ label: 'Tax dashboard', state: state('tax') }
	];

	if (newest) vm.lastActivity = formatRelativeTime(newest, now);
	if (vm.liveCount > 0) vm.agenticLabel = 'Agentic status · Live';
	else if (vm.hasTokens) vm.agenticLabel = 'Agentic status · Ready';
	return vm;
}

function scopeFamily(scope: string): string {
	const s = scope.trim().toLowerCase();
	if (s.startsWith('expenses:')) return 'expenses';
	if (s.startsWith('reports:')) return 'reports';
	if (s.startsWith('market:') || s.startsWith('insights:')) return 'market';
	if (s.startsWith('tax:')) return 'tax';
	return '';
}

// ---- Telegram (settings_telegram.go AttachTelegramStatus) ----

export async function loadTelegramVM(event: RequestEvent): Promise<TelegramVM> {
	let status: TelegramStatus | null;
	try {
		status = await apiJSON<TelegramStatus>(event, 'GET', '/v1/integrations/telegram');
	} catch (err) {
		console.warn('telegram status failed', err);
		return { ...emptyTelegramVM(), loadError: true };
	}
	const vm = mapTelegramStatus(status);
	if (!vm.connected) return vm;
	// Alert switches are only meaningful once there is somewhere to deliver to.
	try {
		const envelope = await apiJSON<{ preferences?: TelegramPreference[] | null }>(
			event,
			'GET',
			'/v1/integrations/telegram/preferences'
		);
		vm.alerts = mapTelegramAlerts(envelope?.preferences ?? []);
	} catch (err) {
		console.warn('telegram preferences failed', err);
	}
	return vm;
}

function mapTelegramStatus(status: TelegramStatus | null): TelegramVM {
	const vm = emptyTelegramVM();
	if (!status) return vm;
	vm.available = !!status.available;
	vm.connected = !!status.connected;
	vm.botUsername = status.botUsername ?? '';
	const now = new Date();
	const connectedAt = parseTime(status.connectedAt);
	if (connectedAt) vm.connectedAt = formatRelativeTime(connectedAt, now);
	const lastSeenAt = parseTime(status.lastSeenAt);
	if (lastSeenAt) vm.lastSeenAt = formatRelativeTime(lastSeenAt, now);
	return vm;
}

function mapTelegramAlerts(prefs: TelegramPreference[]): TelegramAlertRow[] {
	return prefs.map((pref) => ({
		kind: pref.kind,
		label: telegramAlertLabel(pref.kind),
		enabled: !!pref.enabled,
		quietHours:
			pref.quietHoursStart != null && pref.quietHoursEnd != null
				? formatHour(pref.quietHoursStart) + '–' + formatHour(pref.quietHoursEnd)
				: ''
	}));
}

// Go formatHour: hour/10 then hour%10 (integer division), then ":00".
function formatHour(hour: number): string {
	return `${Math.trunc(hour / 10)}${hour % 10}:00`;
}

/** formatCodeLifetime: minutes until the code expires, rounded to the minute. */
export function formatCodeLifetime(expiresAt: string): string {
	const at = parseTime(expiresAt);
	const minutes = at ? Math.round((at.getTime() - Date.now()) / 60000) : 0;
	if (minutes <= 0) return 'a few moments';
	if (minutes === 1) return '1 minute';
	return `${minutes} minutes`;
}

/** telegramStatusURL: the integrations URL carrying a one-shot flash. */
export function telegramStatusURL(state: string, message = ''): string {
	const values = new URLSearchParams();
	if (message.trim() !== '') values.set('msg', message);
	values.set('telegram', state);
	return '/settings/integrations?' + sortedQuery(values);
}

/** integrationsErrorURL (settings_ibkr.go). */
export function integrationsErrorURL(message: string): string {
	const values = new URLSearchParams();
	values.set('ibkr', 'error');
	if (message.trim() !== '') values.set('msg', message);
	return '/settings/integrations?' + sortedQuery(values);
}

// Go url.Values.Encode sorts keys and escapes spaces as "+", as URLSearchParams does.
function sortedQuery(values: URLSearchParams): string {
	values.sort();
	return values.toString();
}
