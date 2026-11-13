// The 3D Vig bust's renderer (BRD-001, docs/vig-3d.md). This is the only module that imports
// three.js; Vig3D.svelte loads it with a dynamic import after first paint, never on the server.
// Motion comes from the pure driver in ../vig-motion.ts; this file only applies it.
import {
	AmbientLight,
	Box3,
	Color,
	DirectionalLight,
	Group,
	HemisphereLight,
	Mesh,
	PerspectiveCamera,
	Scene,
	SRGBColorSpace,
	Vector3,
	WebGLRenderer,
	type Material,
	type Texture
} from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import motionData from '../../../design/vig-motion.json';
import { VIG_MOTION, approach, pointerTimeConstant, pose, pointerTarget } from '../vig-motion';

/** Written by scripts/brand/vig_3d.py beside vig.glb on the CDN. */
interface VigModel {
	version: number;
	framing: { fovDegrees: number; target: [number, number, number]; distance: number };
}

interface LightSpec {
	role: string;
	kind: 'hemisphere' | 'directional' | 'ambient';
	web: { sky?: string; ground?: string; color?: string };
	direction?: [number, number, number];
	intensity: number;
}

export interface VigSceneOptions {
	canvas: HTMLCanvasElement;
	/** The GLB. vig-model.json is read from the same directory. */
	modelUrl: string;
	/** Called after every drawn frame with the entrance opacity, for the canvas/poster cross-fade.
	 * The first call is 0, so the canvas only shows once it has a frame. */
	onOpacity: (opacity: number) => void;
}

export interface VigScene {
	setRunning(running: boolean): void;
	/** Pointer at (x, y), each -1…1 across the stage, right and up positive; null when it leaves. */
	setPointer(x: number | null, y: number | null): void;
	dispose(): void;
}

// One WebGL context per page: a second Vig3D gets the flat poster.
let active = false;

/** A brand token (a CSS custom property, OKLCH) as a three.js colour, through a 1px canvas. */
function tokenColor(name: string): Color {
	const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
	const ctx = document.createElement('canvas').getContext('2d', { willReadFrequently: true });
	if (!value || !ctx) throw new Error(`vig3d: token ${name} is not set`);
	ctx.fillStyle = 'transparent';
	ctx.fillStyle = value;
	ctx.fillRect(0, 0, 1, 1);
	const [r, g, b, a] = ctx.getImageData(0, 0, 1, 1).data;
	if (a === 0) throw new Error(`vig3d: token ${name} (${value}) did not parse`);
	return new Color().setRGB(r / 255, g / 255, b / 255, SRGBColorSpace);
}

function addLights(scene: Scene, lights: LightSpec[]) {
	for (const spec of lights) {
		if (spec.kind === 'hemisphere' && spec.web.sky && spec.web.ground) {
			scene.add(
				new HemisphereLight(tokenColor(spec.web.sky), tokenColor(spec.web.ground), spec.intensity)
			);
		} else if (spec.kind === 'directional' && spec.web.color) {
			const light = new DirectionalLight(tokenColor(spec.web.color), spec.intensity);
			const [x, y, z] = spec.direction ?? [0, 0, 1];
			light.position.set(x, y, z);
			scene.add(light);
		} else if (spec.kind === 'ambient' && spec.web.color) {
			scene.add(new AmbientLight(tokenColor(spec.web.color), spec.intensity));
		} else {
			throw new Error(`vig3d: light ${spec.role} has no web token`);
		}
	}
}

export async function createVigScene(opts: VigSceneOptions): Promise<VigScene> {
	if (active) throw new Error('vig3d: one WebGL context per page');
	active = true;
	let renderer: WebGLRenderer | undefined;
	try {
		const modelInfoUrl = new URL('vig-model.json', new URL(opts.modelUrl, location.href)).href;
		const [gltf, info] = await Promise.all([
			new GLTFLoader().loadAsync(opts.modelUrl),
			fetch(modelInfoUrl, { mode: 'cors' }).then((r) => {
				if (!r.ok) throw new Error(`vig3d: ${modelInfoUrl} ${r.status}`);
				return r.json() as Promise<VigModel>;
			})
		]);

		renderer = new WebGLRenderer({
			canvas: opts.canvas,
			alpha: true,
			antialias: true,
			powerPreference: 'low-power'
		});
		renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
		renderer.outputColorSpace = SRGBColorSpace;

		const scene = new Scene();
		addLights(scene, motionData.lights as LightSpec[]);

		const bust = new Group();
		bust.add(gltf.scene);
		scene.add(bust);

		const { fovDegrees, target, distance } = info.framing;
		const camera = new PerspectiveCamera(fovDegrees, 1, 0.05, distance * 4);
		const look = new Vector3(...target);
		camera.position.set(look.x, look.y, distance);
		camera.lookAt(look);
		const height = new Box3().setFromObject(gltf.scene).getSize(new Vector3()).y || 1;

		const resize = () => {
			const { clientWidth: w, clientHeight: h } = opts.canvas;
			if (!w || !h || !renderer) return;
			renderer.setSize(w, h, false);
			camera.aspect = w / h;
			// A narrow stage must still show the whole bust: widen the vertical fov to fit width.
			camera.fov = w >= h ? fovDegrees : fovDegrees * (h / w);
			camera.updateProjectionMatrix();
		};
		const observer = new ResizeObserver(resize);
		observer.observe(opts.canvas);
		resize();

		let running = false;
		let frame = 0;
		let last = 0;
		let seconds = 0; // advances only while running, so a paused tab resumes where it was
		let firstFrame = true;
		let pointer: { x: number; y: number } | null = null;
		let yaw = 0;
		let pitch = 0;

		const tick = (now: number) => {
			frame = requestAnimationFrame(tick);
			const dt = last ? Math.min((now - last) / 1000, 0.1) : 0;
			last = now;
			if (!firstFrame) seconds += dt;
			const tilt = pointer
				? pointerTarget(VIG_MOTION, pointer.x, pointer.y)
				: { yawDegrees: 0, pitchDegrees: 0 };
			const tau = pointerTimeConstant(VIG_MOTION, pointer !== null);
			yaw = approach(yaw, tilt.yawDegrees, dt, tau);
			pitch = approach(pitch, tilt.pitchDegrees, dt, tau);
			const p = pose(VIG_MOTION, seconds, yaw, pitch);
			bust.rotation.set((p.pitchDegrees * Math.PI) / 180, (p.yawDegrees * Math.PI) / 180, 0);
			bust.position.y = p.rise * height;
			renderer!.render(scene, camera);
			opts.onOpacity(p.opacity);
			firstFrame = false;
		};

		const setRunning = (on: boolean) => {
			if (on === running) return;
			running = on;
			if (on) {
				last = 0;
				frame = requestAnimationFrame(tick);
			} else {
				cancelAnimationFrame(frame);
			}
		};

		const dispose = () => {
			setRunning(false);
			observer.disconnect();
			gltf.scene.traverse((o) => {
				if (!(o instanceof Mesh)) return;
				o.geometry.dispose();
				for (const m of ([] as Material[]).concat(o.material)) {
					for (const v of Object.values(m)) if ((v as Texture)?.isTexture) (v as Texture).dispose();
					m.dispose();
				}
			});
			renderer?.dispose();
			renderer?.forceContextLoss();
			active = false;
		};

		return {
			setRunning,
			setPointer(x, y) {
				pointer = x === null || y === null ? null : { x, y };
			},
			dispose
		};
	} catch (err) {
		renderer?.dispose();
		active = false;
		throw err;
	}
}
