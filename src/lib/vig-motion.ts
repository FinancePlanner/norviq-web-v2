// How the 3D Vig bust moves (BRD-001, docs/vig-3d.md). The numbers live in design/vig-motion.json;
// this module only turns a time and a pointer into a pose. It imports no renderer:
// src/lib/vig3d/scene.ts applies what it returns. The iOS Design/VigMotion.swift is the same
// arithmetic, and both tests check design/vig-motion.fixtures.json, which
// scripts/brand/vig_motion_fixtures.py generates from the reference implementation.
import data from '../../design/vig-motion.json';

export type Easing = 'linear' | 'sine' | 'decelerate';

export interface VigMotion {
	version: number;
	entrance: {
		durationSeconds: number;
		easing: Easing;
		fromOpacity: number;
		fromRise: number;
		fromYawDegrees: number;
	};
	idle: {
		property: 'rotateYDegrees';
		shape: 'sine';
		amplitudeDegrees: number;
		periodSeconds: number;
		startsAfterEntrance: boolean;
	};
	pointer: {
		maxYawDegrees: number;
		maxPitchDegrees: number;
		followSeconds: number;
		returnSeconds: number;
	};
	limits: { maxYawDegrees: number; maxPitchDegrees: number };
}

export interface Entrance {
	opacity: number;
	/** Vertical offset in model heights (the model is 1.0 tall); negative is below rest. */
	rise: number;
	yawDegrees: number;
}

export interface PointerTilt {
	yawDegrees: number;
	pitchDegrees: number;
}

export interface VigPose extends Entrance {
	pitchDegrees: number;
}

export const VIG_MOTION = data as VigMotion;

function clamp(v: number, lo: number, hi: number): number {
	return Math.max(lo, Math.min(hi, v));
}

/** 0 to 1 along a span; `u` is held inside 0…1. */
export function ease(easing: Easing, u: number): number {
	const x = clamp(u, 0, 1);
	if (easing === 'sine') return 0.5 - 0.5 * Math.cos(Math.PI * x);
	if (easing === 'decelerate') return 1 - (1 - x) ** 3;
	return x;
}

/** The entrance `seconds` after the first frame: fading in, rising, turning to face front. */
export function entrance(m: VigMotion, seconds: number): Entrance {
	const e = m.entrance;
	const k = ease(e.easing, seconds / e.durationSeconds);
	return {
		opacity: e.fromOpacity + (1 - e.fromOpacity) * k,
		rise: e.fromRise * (1 - k),
		yawDegrees: e.fromYawDegrees * (1 - k)
	};
}

/** The idle sway's yaw at `seconds`; it starts from zero once the entrance ends. */
export function sway(m: VigMotion, seconds: number): number {
	const i = m.idle;
	const s = i.startsAfterEntrance ? Math.max(0, seconds - m.entrance.durationSeconds) : seconds;
	return i.amplitudeDegrees * Math.sin((2 * Math.PI * s) / i.periodSeconds);
}

/** Where the bust tilts for a pointer at (`x`, `y`), each -1…1 across the stage, right and up
 * positive, held inside that range. Up is a negative pitch (positive pitch tips the face down). */
export function pointerTarget(m: VigMotion, x: number, y: number): PointerTilt {
	return {
		yawDegrees: clamp(x, -1, 1) * m.pointer.maxYawDegrees,
		pitchDegrees: -clamp(y, -1, 1) * m.pointer.maxPitchDegrees
	};
}

/** How quickly the tilt follows: briskly toward an active pointer, slowly back to rest. */
export function pointerTimeConstant(m: VigMotion, active: boolean): number {
	return active ? m.pointer.followSeconds : m.pointer.returnSeconds;
}

/** One frame's step from `current` toward `target`: quick at first, never past it. */
export function approach(
	current: number,
	target: number,
	deltaSeconds: number,
	timeConstantSeconds: number
): number {
	if (timeConstantSeconds <= 0) return target;
	return current + (target - current) * (1 - Math.exp(-deltaSeconds / timeConstantSeconds));
}

/** The whole pose at `seconds`, given the smoothed pointer tilt. Yaw and pitch never pass the
 * limits, so the relief's flat back never shows. */
export function pose(
	m: VigMotion,
	seconds: number,
	pointerYawDegrees: number,
	pointerPitchDegrees: number
): VigPose {
	const e = entrance(m, seconds);
	return {
		opacity: e.opacity,
		rise: e.rise,
		yawDegrees: clamp(
			e.yawDegrees + sway(m, seconds) + pointerYawDegrees,
			-m.limits.maxYawDegrees,
			m.limits.maxYawDegrees
		),
		pitchDegrees: clamp(pointerPitchDegrees, -m.limits.maxPitchDegrees, m.limits.maxPitchDegrees)
	};
}
