// Headless browser smoke test: signs in via /__dev/login, visits every page,
// and reports uncaught page errors, console errors and failed hydration.
//
//   node scripts/smoke-browser.mjs <pages.txt> [baseURL]
//
// Uses the installed Google Chrome (channel: 'chrome'), so no browser download.
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';

const [pagesFile, base = 'http://localhost:5199'] = process.argv.slice(2);
const pages = readFileSync(pagesFile, 'utf8').split('\n').filter(Boolean);

const browser = await chromium.launch({ channel: 'chrome', headless: true });
const context = await browser.newContext();
const page = await context.newPage();
await page.goto(base + '/__dev/login?next=/dashboard', { waitUntil: 'networkidle' });

const ignore = [/posthog/i, /sentry/i, /favicon/i, /Failed to load resource.*(429|502|503)/];
const results = [];
for (const path of pages) {
	const errors = [];
	const onPageError = (e) => errors.push('pageerror: ' + e.message);
	const onConsole = (m) => {
		if (m.type() === 'error' && !ignore.some((re) => re.test(m.text()))) errors.push('console: ' + m.text());
	};
	page.on('pageerror', onPageError);
	page.on('console', onConsole);
	let status = 0;
	try {
		const res = await page.goto(base + path, { waitUntil: 'networkidle', timeout: 30000 });
		status = res?.status() ?? 0;
	} catch (e) {
		errors.push('nav: ' + e.message.split('\n')[0]);
	}
	page.off('pageerror', onPageError);
	page.off('console', onConsole);
	results.push({ path, status, url: page.url().replace(base, ''), errors });
}
await browser.close();

let bad = 0;
for (const r of results) {
	if (r.errors.length || r.status >= 400) {
		bad++;
		console.log(`✗ ${r.path} [${r.status}] → ${r.url}`);
		for (const e of [...new Set(r.errors)].slice(0, 4)) console.log('    ' + e.slice(0, 300));
	}
}
console.log(`\n${results.length - bad}/${results.length} clean`);
