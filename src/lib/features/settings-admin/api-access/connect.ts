// Port of norviq-web internal/handlers/settings_apiaccess_clients.go,
// settings_apiaccess_verify.go and the view model in
// internal/pages/settings/apiaccess_viewmodel.go.

/** Production MCP server address, used whenever MCP_PUBLIC_URL is unset. */
export const DEFAULT_MCP_ENDPOINT = 'https://mcp.norviq.org/mcp';

/** Stands in for the plaintext token everywhere except the render right after creation. */
export const TOKEN_PLACEHOLDER = 'nvq_pat_…';

export interface APITokenRow {
	id: string;
	name: string;
	scopes: string[];
	lastUsed: string;
	expires: string;
	created: string;
}

export interface APIScopeOption {
	value: string;
	label: string;
	checked: boolean;
}

export interface ConnectClientVM {
	id: string;
	label: string;
	brand: string;
	isActive: boolean;
	prompt: string;
	cli: string;
	config: string;
	installer: string;
	oauthOnly: boolean;
	oauthHint: string;
}

export type VerifyStateName = 'waiting' | 'connected' | 'timeout';

export interface VerifyStateVM {
	tokenID: string;
	state: VerifyStateName;
	lastUsed: string;
	keepPolling: boolean;
	pollURL: string;
}

// Mirrors APIScope in the backend. Reads are pre-ticked, writes are not.
export const API_ACCESS_SCOPES: APIScopeOption[] = [
	{ value: 'watchlist:read', label: 'Read your watchlists', checked: true },
	{ value: 'watchlist:write', label: 'Add, edit, and remove watchlist entries', checked: false },
	{ value: 'holdings:read', label: 'Read your holdings and positions', checked: true },
	{ value: 'holdings:write', label: 'Add, edit, sell, and delete positions', checked: false },
	{ value: 'transactions:read', label: 'Read your recorded trades and profit/loss', checked: true },
	{ value: 'transactions:write', label: 'Record, edit, and delete trades', checked: false },
	{ value: 'portfolio:read', label: 'Read your portfolio holdings', checked: true },
	{ value: 'portfolio:write', label: 'Create and edit portfolios and cash accounts', checked: false },
	{ value: 'targets:read', label: 'Read your price targets and alerts', checked: false },
	{ value: 'targets:write', label: 'Create and delete price targets and alerts', checked: false },
	{ value: 'crypto:read', label: 'Read your crypto holdings', checked: false },
	{ value: 'crypto:write', label: 'Add, edit, and remove crypto holdings', checked: false },
	{ value: 'research:read', label: 'Read your research notes and saved articles', checked: false },
	{ value: 'research:write', label: 'Write and delete research notes and saved articles', checked: false },
	{ value: 'expenses:read', label: 'Read expenses', checked: true },
	{ value: 'expenses:write', label: 'Add and edit expenses', checked: true },
	{ value: 'budget:read', label: 'Read your budget snapshots and plan items', checked: false },
	{ value: 'budget:write', label: 'Create and edit budget snapshots and plan items', checked: false },
	{ value: 'goals:read', label: 'Read your goals', checked: false },
	{ value: 'goals:write', label: 'Create, edit, and delete goals', checked: false },
	{ value: 'planning:read', label: 'Read scenarios, forecasts, and rebalancing plans', checked: false },
	{ value: 'planning:write', label: 'Create and run scenarios and forecasts', checked: false },
	{ value: 'reports:read', label: 'Read spending reports', checked: true },
	{ value: 'market:read', label: 'Read market data', checked: false },
	{ value: 'insights:read', label: 'Read market insights', checked: false },
	{ value: 'tax:read', label: 'Read tax estimates', checked: false },
	{ value: 'tax:write', label: 'Edit your tax profile and generate tax reports', checked: false },
	{ value: 'notifications:read', label: 'Read your notifications', checked: false },
	{ value: 'notifications:write', label: 'Mark notifications read and change preferences', checked: false },
	{ value: 'settings:read', label: 'Read your account preferences', checked: false },
	{ value: 'settings:write', label: 'Change your account preferences', checked: false },
	{ value: 'integrations:read', label: 'Read your connected banks and brokers', checked: false },
	{ value: 'integrations:write', label: 'Connect, sync, and disconnect banks and brokers', checked: false },
	{ value: 'billing:read', label: 'Read your subscription status', checked: false },
	{ value: 'billing:write', label: 'Restore purchases and redeem coupons', checked: false },
	{ value: 'export:read', label: 'Read and download your data exports', checked: false },
	{ value: 'export:write', label: 'Create data exports of your account', checked: false },
	{ value: 'assistant:read', label: 'Read your assistant conversations and insights', checked: false },
	{ value: 'assistant:write', label: 'Start assistant conversations', checked: false }
];

const resolveToken = (token: string) => (token.trim() === '' ? TOKEN_PLACEHOLDER : token);

export function cliCommand(clientID: string, endpoint: string, token: string): string {
	const tok = resolveToken(token);
	switch (clientID) {
		case 'claude-code':
			return 'claude mcp add --transport http norviq ' + endpoint + ` --header "Authorization: Bearer ${tok}"`;
		case 'hermes':
			return (
				'sudo hermes --profile mac-mcp mcp add norviq \\\n' +
				'  --url ' +
				endpoint +
				' \\\n' +
				'  --auth header\n' +
				'# Header: Authorization = Bearer ' +
				tok +
				'\n' +
				'sudo hermes --profile mac-mcp mcp test norviq'
			);
	}
	return '';
}

interface ConnectClient {
	id: string;
	label: string;
	brand: string;
	modes: string[];
	default?: boolean;
}

export const CONNECT_CLIENTS: ConnectClient[] = [
	{ id: 'claude-code', label: 'Claude Code', brand: 'claude', modes: ['prompt', 'cli', 'config', 'installer'], default: true },
	{ id: 'codex', label: 'Codex', brand: 'openai', modes: ['prompt', 'config', 'installer'] },
	{ id: 'hermes', label: 'Hermes', brand: 'hermes', modes: ['prompt', 'cli'] },
	{ id: 'cursor', label: 'Cursor', brand: 'cursor', modes: ['prompt', 'config'] },
	{ id: 'claude-web', label: 'Claude (web & desktop)', brand: 'claude', modes: ['oauth'] },
	{ id: 'chatgpt', label: 'ChatGPT', brand: 'openai', modes: ['oauth'] }
];

export function mcpConfig(clientID: string, endpoint: string, token: string): string {
	const tok = resolveToken(token);
	if (clientID === 'codex') {
		return '[mcp_servers.norviq]\n' + `url = "${endpoint}"` + '\n' + `http_headers = { Authorization = "Bearer ${tok}" }`;
	}
	const doc = { mcpServers: { norviq: { type: 'http', url: endpoint, headers: { Authorization: 'Bearer ' + tok } } } };
	// Go json.MarshalIndent escapes <, > and & as < etc.; none occur in these values.
	return JSON.stringify(doc, null, 2);
}

export function installerCommand(endpoint: string, token: string): string {
	let cmd = `curl -fsSL https://norviq.org/install.sh | NORVIQ_TOKEN="${resolveToken(token)}"`;
	if (endpoint !== '' && endpoint !== DEFAULT_MCP_ENDPOINT) cmd += ` NORVIQ_ENDPOINT="${endpoint}"`;
	return cmd + ' bash';
}

export function setupPrompt(clientID: string, endpoint: string, token: string): string {
	let b = 'Set up Norviq for me so you can read and manage my portfolio and expenses.\n';
	const cli = cliCommand(clientID, endpoint, resolveToken(token));
	if (cli !== '') {
		b += '1. Register the MCP server by running:\n' + cli + '\n2. Confirm the norviq server is listed and reachable.\n';
	} else {
		b +=
			'1. Add this remote MCP server to your config:\n' +
			mcpConfig(clientID, endpoint, resolveToken(token)) +
			'\n2. Reload your config and confirm the norviq server is reachable.\n';
	}
	b += '3. Then list my three most recent expenses so we know it works.\n';
	b += "Once that's done, let me know when it's ready.";
	return b;
}

const oauthHints: Record<string, string> = {
	'claude-web':
		'Settings → Connectors → Add custom connector. Paste the server address below and authorize in your browser — no Norviq token needed. Claude still bills your Anthropic plan for chat tokens.',
	chatgpt:
		'Settings → Connectors → Add. Paste the server address below and complete the browser sign-in. OpenAI bills your ChatGPT plan for model use.'
};

export function verifyPollURL(tokenID: string, startedAtMs: number): string {
	return '/settings/api-access/' + tokenID + '/verify?started=' + Math.floor(startedAtMs / 1000);
}

/** AttachConnectPanel: builds the client tabs; must run after the token flash was popped. */
export function buildConnectPanel(
	mcpEndpoint: string,
	newToken: string,
	activeClient: string,
	verifyTokenID: string,
	now: number
): { activeClient: string; clients: ConnectClientVM[]; verify: VerifyStateVM | null } {
	let active = activeClient.trim();
	if (!CONNECT_CLIENTS.some((c) => c.id === active)) {
		active = CONNECT_CLIENTS.find((c) => c.default)?.id ?? CONNECT_CLIENTS[0]?.id ?? '';
	}
	const clients = CONNECT_CLIENTS.map((c) => {
		const row: ConnectClientVM = {
			id: c.id,
			label: c.label,
			brand: c.brand,
			isActive: c.id === active,
			prompt: '',
			cli: '',
			config: '',
			installer: '',
			oauthOnly: false,
			oauthHint: ''
		};
		for (const mode of c.modes) {
			switch (mode) {
				case 'prompt':
					row.prompt = setupPrompt(c.id, mcpEndpoint, newToken);
					break;
				case 'cli':
					row.cli = cliCommand(c.id, mcpEndpoint, newToken);
					break;
				case 'config':
					row.config = mcpConfig(c.id, mcpEndpoint, newToken);
					break;
				case 'installer':
					row.installer = installerCommand(mcpEndpoint, newToken);
					break;
				case 'oauth':
					row.oauthOnly = true;
					row.oauthHint = oauthHints[c.id] ?? '';
					break;
			}
		}
		return row;
	});
	const verify: VerifyStateVM | null = verifyTokenID
		? { tokenID: verifyTokenID, state: 'waiting', lastUsed: '', keepPolling: true, pollURL: verifyPollURL(verifyTokenID, now) }
		: null;
	return { activeClient: active, clients, verify };
}
