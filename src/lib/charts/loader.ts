// Port of norviq-web internal/server/assets/echarts-loader.js: load the slim
// ECharts bundle only when a page actually renders a chart. On the first page
// load it waits for an idle moment (as Go did); once the page has loaded, a
// chart that appears later (client navigation, like an HTMX swap) loads it
// straight away.
type ECharts = typeof import('./echarts-slim.js').echarts;

let loadPromise: Promise<ECharts> | null = null;
let loaded: ECharts | null = null;

export function loadECharts(): Promise<ECharts> {
	if (loaded) return Promise.resolve(loaded);
	if (!loadPromise) {
		loadPromise = import('./echarts-slim.js').then(
			(m) => (loaded = m.echarts),
			(err) => {
				loadPromise = null;
				throw err;
			}
		);
	}
	return loadPromise;
}

/** Idle-scheduled load while the document is still loading; immediate otherwise. */
export function ensureECharts(): Promise<ECharts> {
	if (loaded || loadPromise || document.readyState === 'complete') return loadECharts();
	return new Promise((resolve, reject) => {
		const start = () => loadECharts().then(resolve, reject);
		if ('requestIdleCallback' in globalThis) requestIdleCallback(start, { timeout: 1800 });
		else setTimeout(start, 1);
	});
}
