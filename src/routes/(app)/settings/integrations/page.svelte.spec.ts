import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { page } from 'vitest/browser';
import '../../../layout.css';
import {
	emptyIBKRVM,
	emptyTelegramVM,
	type IBKRConnectionVM,
	type IntegrationsViewModel
} from '#lib/features/settings-admin/integrations/types.js';
import Page from './+page.svelte';

function vmWith(ibkr: IBKRConnectionVM): IntegrationsViewModel {
	return {
		brokers: [],
		ibkr,
		mcp: {
			isPro: true,
			hasTokens: false,
			tokenCount: 0,
			liveCount: 0,
			lastActivity: '',
			agenticLabel: '',
			scopes: [],
			agents: [],
			loadError: false,
			needsPro: false,
			empty: true
		},
		telegram: emptyTelegramVM(),
		appStoreURL: '',
		hasLoadError: false,
		errorMessage: '',
		successMessage: ''
	};
}

function ibkrRow(status: string): IBKRConnectionVM {
	return {
		...emptyIBKRVM(),
		hasConnection: true,
		status,
		statusLabel: status,
		isConnected: status === 'connected'
	};
}

const cases: [string, IBKRConnectionVM][] = [
	['connected', ibkrRow('connected')],
	['error', ibkrRow('error')],
	['disconnected', ibkrRow('disconnected')],
	['absent', emptyIBKRVM()]
];

describe('Settings > Integrations IBKR section', () => {
	it.each(cases)('shows the import notice when the row is %s', async (_name, ibkr) => {
		render(Page, { props: { data: { vm: vmWith(ibkr) }, form: null, params: {} } as never });

		await expect.element(page.getByText('Import IBKR holdings')).toBeInTheDocument();
		await expect
			.element(
				page.getByText(
					'Screenshot your positions in the IBKR app or Client Portal and import them from your portfolio. Statement import with full trade history is coming next.'
				)
			)
			.toBeInTheDocument();
		const link = page.getByRole('link', { name: 'Import from broker' });
		await expect.element(link).toHaveAttribute('href', '/portfolio/import');

		expect(document.querySelector('input[name="token"]')).toBeNull();
		expect(document.querySelector('input[name="queryId"]')).toBeNull();
		expect(document.body.textContent).not.toContain('Sync now');
		expect(document.body.textContent).not.toContain('Connect a broker above');
		expect(document.querySelector('a[href^="mailto:reportingintegration@"]')).toBeNull();
	});

	it.each([
		['connected', true],
		['error', true],
		['disconnected', false],
		['absent', false]
	])('Disconnect is offered only for connected/error rows (%s)', async (name, shown) => {
		const ibkr = cases.find(([n]) => n === name)![1];
		render(Page, { props: { data: { vm: vmWith(ibkr) }, form: null, params: {} } as never });
		await expect.element(page.getByText('Import IBKR holdings')).toBeInTheDocument();
		expect(document.querySelector('form[action="?/ibkrDisconnect"]') !== null).toBe(shown);
	});
});
