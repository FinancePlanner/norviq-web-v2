// Full-page screenshots of the key screens, for before/after design review.
//
//   node scripts/screenshots.mjs <outDir> [baseURL]
//
// Captures every page in PUBLIC and APP in light and dark, at a phone and a
// desktop width. Signs in like smoke-browser.mjs (via /__dev/login, so run it
// against a local dev server pointed at the staging API — never production
// data). SCREENSHOT_REDUCED_MOTION=1 also emulates prefers-reduced-motion.
//
// Uses the installed Google Chrome (channel: 'chrome'), so no browser download.
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const [outDir, base = 'http://localhost:5199'] = process.argv.slice(2);
if (!outDir) {
	console.error('usage: node scripts/screenshots.mjs <outDir> [baseURL]');
	process.exit(2);
}

const PUBLIC = ['/', '/login', '/signup', '/privacy', '/brief'];
const APP = [
	'/dashboard',
	'/dashboard/pulse',
	'/portfolio',
	'/portfolio/allocation',
	'/portfolio/watchlist',
	'/portfolio/AAPL/chart',
	'/terminal',
	'/reports',
	'/markets',
	'/expenses',
	'/assistant',
	'/boards',
	'/groups',
	'/achievements',
	'/settings',
	'/settings/appearance'
];
const VIEWPORTS = { phone: { width: 390, height: 844 }, desktop: { width: 1440, height: 900 } };
const THEMES = ['light', 'dark'];
const reducedMotion = process.env.SCREENSHOT_REDUCED_MOTION === '1' ? 'reduce' : 'no-preference';

const slug = (path) => (path === '/' ? 'home' : path.slice(1).replaceAll('/', '_'));

mkdirSync(outDir, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
let shots = 0;

for (const theme of THEMES) {
	for (const [vpName, viewport] of Object.entries(VIEWPORTS)) {
		const context = await browser.newContext({ viewport, colorScheme: theme, reducedMotion });
		// The blocking script in app.html reads this key before first paint.
		await context.addInitScript((t) => localStorage.setItem('app_appearance', t), theme);
		const page = await context.newPage();

		const capture = async (path) => {
			try {
				await page.goto(base + path, { waitUntil: 'networkidle', timeout: 30000 });
				// Let entrance animations and chart draw-ins settle.
				await page.waitForTimeout(600);
				const file = join(outDir, `${slug(path)}--${theme}--${vpName}.png`);
				await page.screenshot({ path: file, fullPage: true });
				shots++;
			} catch (e) {
				console.log(`✗ ${path} ${theme} ${vpName}: ${e.message.split('\n')[0]}`);
			}
		};

		for (const path of PUBLIC) await capture(path);
		await page.goto(base + '/__dev/login?next=/dashboard', { waitUntil: 'networkidle' });
		for (const path of APP) await capture(path);
		await context.close();
	}
}

await browser.close();
console.log(`${shots} screenshots → ${outDir}`);
