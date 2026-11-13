<script lang="ts">
	// components.Vig3D: the 3D Vig bust (BRD-001, docs/vig-3d.md). Beta only: it renders only when
	// the page passes a model URL, and VIG_3D_MODEL_URL is empty in production.
	//
	// The flat poster is the first paint and the fallback. The 3D scene is a dynamic import after
	// first paint, never on the server, and replaces the poster only after it has drawn a frame.
	// The poster stays under reduced motion, Save-Data, no WebGL, or any load error.
	import { onMount } from 'svelte';
	import type { VigScene } from '#lib/vig3d/scene.js';

	interface Props {
		/** vig.glb on the CDN; vig-poster.png and vig-model.json sit beside it. */
		modelUrl: string;
		/** Stage size in CSS pixels (square). */
		size?: number;
	}

	let { modelUrl, size = 240 }: Props = $props();

	const posterUrl = $derived(new URL('vig-poster.png', modelUrl).href);
	let canvas = $state<HTMLCanvasElement>();
	let stage = $state<HTMLDivElement>();
	let opacity = $state(0); // the canvas's; the poster shows 1 - opacity
	let posterFailed = $state(false);

	function wants3D(): boolean {
		if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return false;
		const connection = (navigator as Navigator & { connection?: { saveData?: boolean } })
			.connection;
		if (connection?.saveData) return false;
		return typeof WebGL2RenderingContext !== 'undefined';
	}

	onMount(() => {
		if (!wants3D()) return;
		let scene: VigScene | undefined;
		let disposed = false;
		let visible = true;
		let onScreen = false;
		const update = () => scene?.setRunning(visible && onScreen);

		const io = new IntersectionObserver(([entry]) => {
			onScreen = entry.isIntersecting;
			update();
		});
		const onVisibility = () => {
			visible = document.visibilityState === 'visible';
			update();
		};
		const onPointer = (e: PointerEvent) => {
			const rect = stage?.getBoundingClientRect();
			if (!rect || !scene) return;
			// The whole window steers: the form sits beside the panel, so Vig turns toward it.
			const x = (e.clientX - (rect.left + rect.width / 2)) / (rect.width / 2);
			const y = -(e.clientY - (rect.top + rect.height / 2)) / (rect.height / 2);
			scene.setPointer(x, y);
		};
		const onLeave = () => scene?.setPointer(null, null);

		// After first paint: the poster is already on screen when the import starts.
		const start = () => {
			import('#lib/vig3d/scene.js')
				.then(({ createVigScene }) =>
					createVigScene({
						canvas: canvas!,
						modelUrl,
						onOpacity: (o) => (opacity = o)
					})
				)
				.then((s) => {
					if (disposed) return s.dispose();
					scene = s;
					visible = document.visibilityState === 'visible';
					if (stage) io.observe(stage);
					document.addEventListener('visibilitychange', onVisibility);
					window.addEventListener('pointermove', onPointer, { passive: true });
					document.documentElement.addEventListener('pointerleave', onLeave);
				})
				.catch((err: unknown) => {
					opacity = 0; // keep the poster
					console.warn('vig3d: staying flat', err);
				});
		};
		const idle =
			'requestIdleCallback' in window ? requestIdleCallback(start) : setTimeout(start, 200);

		return () => {
			disposed = true;
			if ('cancelIdleCallback' in window && typeof idle === 'number') cancelIdleCallback(idle);
			else clearTimeout(idle as ReturnType<typeof setTimeout>);
			io.disconnect();
			document.removeEventListener('visibilitychange', onVisibility);
			window.removeEventListener('pointermove', onPointer);
			document.documentElement.removeEventListener('pointerleave', onLeave);
			scene?.dispose();
		};
	});
</script>

<!-- Inline styles: no CSS asset to preload with the lazy chunk. The poster's 5.4% padding matches
     vig-model.json framing (12% around the bust), so the cross-fade does not jump. -->
{#if !posterFailed}
	<div
		bind:this={stage}
		style:position="relative"
		style:margin-bottom="1.5rem"
		style:width="{size}px"
		style:height="{size}px"
	>
		<img
			src={posterUrl}
			alt=""
			width={size}
			height={size}
			decoding="async"
			style="position:absolute;inset:0;width:100%;height:100%;object-fit:contain;padding:5.4%"
			style:opacity={1 - opacity}
			onerror={() => (posterFailed = true)}
		/>
		<canvas
			bind:this={canvas}
			aria-hidden="true"
			style="position:absolute;inset:0;width:100%;height:100%"
			style:opacity
		></canvas>
	</div>
{/if}
