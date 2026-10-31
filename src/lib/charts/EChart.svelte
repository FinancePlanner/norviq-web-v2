<!--
	An ECharts chart, the v2 replacement for the Go charts' HTML + deferred init
	script. Usage: `<EChart {...spec} />` with a spec from a #lib/charts builder,
	or `<EChart id="x" height="220px" option={…} />` for a hand-built option.

	Server render: only the empty, sized container (exactly what Go's HTML
	held before its script ran), so the page does not shift when the chart
	draws. ECharts itself is imported on the client only, lazily.

	Client: inits on mount (canvas renderer, no ECharts theme — like Go), sets
	the option, then applies the Norviq theme patch (theme.ts, the port of
	echarts-theme.js + refreshCharts) when the chart sits inside
	.app-page-content, which is where Go's refreshCharts() looked. Re-themes
	when <html>'s class / data-theme / data-brand change, resizes with its
	container, and disposes on destroy.
-->
<script lang="ts">
	import type { EChartsOption, ECharts } from 'echarts';
	import { onMount } from 'svelte';
	import { ensureECharts } from './loader.js';
	import { FADE_WRAPPERS, domThemeEnv, themedOptionPatch } from './theme.js';
	import type { ChartClickParams } from './types.js';

	interface Props {
		/** DOM id; also picks the chart "kind" for theming (spark…, spending…, allocation…). */
		id: string;
		option: EChartsOption;
		width?: string;
		height?: string;
		/** Extra class on the .item node. */
		class?: string;
		onclick?: (params: ChartClickParams) => void;
		/** Apply the Norviq theme patch. Default: only inside .app-page-content, as in Go. */
		themed?: boolean;
	}

	let {
		id,
		option,
		width = '100%',
		height = '220px',
		class: klass = '',
		onclick,
		themed
	}: Props = $props();

	let node: HTMLDivElement;
	let chart = $state.raw<ECharts | null>(null);

	function shouldTheme(): boolean {
		return themed ?? node.closest('.app-page-content') !== null;
	}

	function fadeIn() {
		const env = domThemeEnv();
		const wrap = node.closest(FADE_WRAPPERS);
		if (!wrap || env.reducedMotion || wrap.classList.contains('chart-fade-in')) return;
		wrap.classList.add('chart-fade-in');
		setTimeout(() => wrap.classList.remove('chart-fade-in'), 520);
	}

	function applyTheme(c: ECharts) {
		if (!shouldTheme()) return;
		c.setOption(themedOptionPatch(c.getOption() as Record<string, unknown>, id, domThemeEnv()));
		fadeIn();
	}

	onMount(() => {
		let destroyed = false;
		let instance: ECharts | null = null;

		const resize = () => instance?.resize();
		const observer = new ResizeObserver(resize);
		const themeObserver = new MutationObserver(() => instance && applyTheme(instance));

		ensureECharts().then(
			(echarts) => {
				if (destroyed) return;
				instance = echarts.init(node, null, { renderer: 'canvas' });
				chart = instance;
				if (domThemeEnv().coarsePointer) {
					const painter = (
						instance.getZr() as unknown as { painter?: { type?: string; root?: HTMLElement } }
					).painter;
					if (painter?.type === 'canvas' && painter.root)
						painter.root.style.touchAction = 'manipulation';
				}
				instance.on('click', (params) => onclick?.(params as ChartClickParams));
				observer.observe(node);
				themeObserver.observe(document.documentElement, {
					attributes: true,
					attributeFilter: ['class', 'data-theme', 'data-brand']
				});
				window.addEventListener('overviewChartsResize', resize);
			},
			(err) => console.error(err)
		);

		return () => {
			destroyed = true;
			observer.disconnect();
			themeObserver.disconnect();
			window.removeEventListener('overviewChartsResize', resize);
			instance?.dispose();
			chart = null;
		};
	});

	// First draw and every option change: replace the option, then re-theme.
	$effect(() => {
		const c = chart;
		const next = option;
		if (!c) return;
		try {
			c.setOption(next, { notMerge: true });
			applyTheme(c);
		} catch (err) {
			console.error(err);
		}
	});
</script>

<!-- max-width:none: Tailwind v4 generates a .container utility (breakpoint
     max-widths) that the Go web's CSS did not have; the class stays for the
     legacy `.overview-* .container` rules. -->
<div class="container" style="max-width:none">
	<div bind:this={node} class={['item', klass]} {id} style:width style:height></div>
</div>
