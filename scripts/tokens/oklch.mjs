// sRGB hex <-> OKLCH (Björn Ottosson's OKLab), with no dependency. Used by
// scripts/tokens/build.mjs to write theme.tokens.css and by its tests.

/** @param {number} c sRGB channel, 0..1 */
const toLinear = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);

/**
 * @param {string} hex #RRGGBB or #RRGGBBAA
 * @returns {[number, number, number]} OKLab L, a, b
 */
export function hexToOklab(hex) {
	const m = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})?$/i.exec(hex);
	if (!m) throw new Error(`not a #RRGGBB[AA] colour: ${hex}`);
	const [r, g, b] = [m[1], m[2], m[3]].map((h) => toLinear(Number.parseInt(h, 16) / 255));
	const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
	const mm = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
	const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
	return [
		0.2104542553 * l + 0.793617785 * mm - 0.0040720468 * s,
		1.9779984951 * l - 2.428592205 * mm + 0.4505937099 * s,
		0.0259040371 * l + 0.7827717662 * mm - 0.808675766 * s
	];
}

/**
 * @param {number} l
 * @param {number} c
 * @param {number} h degrees
 * @returns {[number, number, number]} OKLab L, a, b
 */
export function oklchToOklab(l, c, h) {
	const rad = (h * Math.PI) / 180;
	return [l, c * Math.cos(rad), c * Math.sin(rad)];
}

/**
 * @param {string} hex #RRGGBB or #RRGGBBAA
 * @returns {{ l: number; c: number; h: number; alpha: number }} unrounded; alpha 0..1
 */
export function hexToOklch(hex) {
	const [l, a, b] = hexToOklab(hex);
	const c = Math.hypot(a, b);
	const h = ((((Math.atan2(b, a) * 180) / Math.PI) % 360) + 360) % 360;
	const alpha = hex.length === 9 ? Number.parseInt(hex.slice(7), 16) / 255 : 1;
	return { l, c, h, alpha };
}

/** @param {number} n @param {number} digits */
const fixed = (n, digits) => String(Number(n.toFixed(digits)));

/**
 * CSS for a hex: L and C to 3 decimals, H to 1, alpha as a whole percent
 * (the token's alpha byte is round(alpha × 255)). Achromatic colours get hue 0.
 * @param {string} hex
 */
export function oklchCss(hex) {
	const { l, c, h, alpha } = hexToOklch(hex);
	const cc = Number(c.toFixed(3));
	const parts = `${fixed(l, 3)} ${fixed(cc, 3)} ${cc === 0 ? '0' : fixed(h, 1)}`;
	return alpha === 1 ? `oklch(${parts})` : `oklch(${parts} / ${Math.round(alpha * 100)}%)`;
}
