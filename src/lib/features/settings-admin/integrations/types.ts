// Port of norviq-web internal/pages/settings/integrations_viewmodel.go.

export interface MCPScopeRow {
	label: string;
	state: string; // live | ready | off
}

export interface MCPAgentRow {
	name: string;
	scopes: string;
	lastUsed: string;
	status: string;
	isLive: boolean;
}

export interface MCPStatusVM {
	isPro: boolean;
	hasTokens: boolean;
	tokenCount: number;
	liveCount: number;
	lastActivity: string;
	agenticLabel: string;
	scopes: MCPScopeRow[];
	agents: MCPAgentRow[];
	loadError: boolean;
	needsPro: boolean;
	empty: boolean;
}

export interface IBKRConnectionVM {
	hasConnection: boolean;
	isConnected: boolean;
	status: string;
	statusLabel: string;
	statusDetail: string;
	displayName: string;
	lastSyncedLabel: string;
	canSync: boolean;
}

export interface BrokerRow {
	provider: string;
	status: string;
	label: string;
}

export interface TelegramAlertRow {
	kind: string;
	label: string;
	enabled: boolean;
	quietHours: string;
}

export interface TelegramVM {
	available: boolean;
	connected: boolean;
	botUsername: string;
	connectedAt: string;
	lastSeenAt: string;
	// Set on exactly one response: the one that minted it.
	code: string;
	codeExpiresIn: string;
	deepLink: string;
	alerts: TelegramAlertRow[];
	loadError: boolean;
}

export interface IntegrationsViewModel {
	brokers: BrokerRow[];
	ibkr: IBKRConnectionVM;
	mcp: MCPStatusVM;
	telegram: TelegramVM;
	appStoreURL: string;
	hasLoadError: boolean;
	errorMessage: string;
	successMessage: string;
}

/** settingsMCPAgentState: the state string MCPStateBadge expects for an agent row. */
export function settingsMCPAgentState(agent: MCPAgentRow): string {
	if (agent.isLive) return 'live';
	if (agent.status === 'Never') return 'off';
	return 'ready';
}

/** settings.TelegramAlertLabel */
export function telegramAlertLabel(kind: string): string {
	switch (kind) {
		case 'price_target':
			return 'Price targets';
		case 'budget':
			return 'Budget alerts';
		case 'earnings':
			return 'Earnings reminders';
		case 'tax':
			return 'Tax opportunities';
		case 'watchlist_screen':
			return 'Watchlist screens';
		case 'rebalancing':
			return 'Rebalancing drift';
		case 'financial_goal':
			return 'Financial goals';
		case 'thesis_watch':
			return 'Thesis watch';
		default:
			return kind;
	}
}

/** telegramToggleValue: the value the alert form posts back, the opposite of the current state. */
export function telegramToggleValue(enabled: boolean): string {
	return enabled ? 'false' : 'true';
}

// TelegramPrivacyWarning must stay in step with /privacy#telegram.
export const TELEGRAM_PRIVACY_WARNING =
	"Telegram chats are not end-to-end encrypted. Replies can include your portfolio values, budgets and expenses, and are stored on Telegram's servers.";

export function emptyTelegramVM(): TelegramVM {
	return {
		available: false,
		connected: false,
		botUsername: '',
		connectedAt: '',
		lastSeenAt: '',
		code: '',
		codeExpiresIn: '',
		deepLink: '',
		alerts: [],
		loadError: false
	};
}

export function emptyIBKRVM(): IBKRConnectionVM {
	return {
		hasConnection: false,
		isConnected: false,
		status: '',
		statusLabel: '',
		statusDetail: '',
		displayName: '',
		lastSyncedLabel: '',
		canSync: false
	};
}
