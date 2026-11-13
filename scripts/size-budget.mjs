#!/usr/bin/env bun
// Route size budget (BRD-001, docs/vig-3d.md). Run after `bun run build`.
//
//   bun scripts/size-budget.mjs            check against size-budget.json
//   bun scripts/size-budget.mjs --update   re-seed every number (say why in the PR)
//   bun scripts/size-budget.mjs --update-lazy   re-seed only lazyTotalGzip
//
// A route's size is the gzipped JS it loads before any dynamic import: the client entry chunks
// plus its layouts' and page's nodes, following static imports only. Those must not grow.
// lazyTotalGzip is every client JS file, lazy chunks included; it may grow, but only by an explicit
// --update-lazy, so a new lazy dependency (three.js) is a visible, reviewed change.
import { readFileSync, readdirSync, writeFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';

const CLIENT = '.svelte-kit/output/client';
const MANIFEST = join(CLIENT, '.vite/manifest.json');
const SERVER_MANIFEST = '.svelte-kit/output/server/manifest.js';
const BUDGET = 'size-budget.json';
const TOLERANCE = 256; // gzip bytes per route, for noise in shared chunk hashing

const args = new Set(process.argv.slice(2));
const manifest = JSON.parse(readFileSync(MANIFEST, 'utf8'));

const gzCache = new Map();
function gz(file) {
	if (!gzCache.has(file))
		gzCache.set(file, gzipSync(readFileSync(join(CLIENT, file)), { level: 9 }).length);
	return gzCache.get(file);
}

function closure(keys) {
	const seen = new Set();
	const files = new Set();
	const stack = [...keys];
	while (stack.length) {
		const key = stack.pop();
		if (seen.has(key)) continue;
		seen.add(key);
		const chunk = manifest[key];
		if (!chunk) throw new Error(`size-budget: ${key} is not in the client manifest`);
		if (chunk.file.endsWith('.js')) files.add(chunk.file);
		for (const dep of chunk.imports ?? []) stack.push(dep);
	}
	return files;
}

const entryKeys = Object.keys(manifest).filter(
	(k) => manifest[k].isEntry && !manifest[k].isDynamicEntry && !k.includes('/nodes/')
);
const nodeKey = (n) => {
	const key = Object.keys(manifest).find((k) => k.endsWith(`/client-optimized/nodes/${n}.js`));
	if (!key) throw new Error(`size-budget: no client node ${n}`);
	return key;
};

// Routes with a page: `id: "/(guest)/login", … page: { layouts: [0,9,], errors: [1,,], leaf: 144 }`
const server = readFileSync(SERVER_MANIFEST, 'utf8');
const routeRe =
	/id:\s*"([^"]+)"[^]*?page:\s*(null|\{\s*layouts:\s*\[([^\]]*)\][^}]*leaf:\s*(\d+)\s*\})/g;
const routes = {};
for (const m of server.matchAll(routeRe)) {
	if (m[2] === 'null' || routes[m[1]] !== undefined) continue;
	const nodes = [
		...m[3]
			.split(',')
			.filter((s) => s.trim() !== '')
			.map(Number),
		Number(m[4])
	];
	const files = closure([...entryKeys, ...nodes.map(nodeKey)]);
	routes[m[1]] = [...files].reduce((sum, f) => sum + gz(f), 0);
}
if (Object.keys(routes).length === 0)
	throw new Error('size-budget: found no routes; did the build run?');

function allJs(dir) {
	return readdirSync(dir).flatMap((name) => {
		const p = join(dir, name);
		return statSync(p).isDirectory()
			? allJs(p)
			: p.endsWith('.js')
				? [p.slice(CLIENT.length + 1)]
				: [];
	});
}
const lazyTotalGzip = allJs(join(CLIENT, '_app')).reduce((sum, f) => sum + gz(f), 0);

const sorted = Object.fromEntries(Object.entries(routes).sort(([a], [b]) => a.localeCompare(b)));
if (args.has('--update')) {
	writeFileSync(
		BUDGET,
		JSON.stringify({ tolerance: TOLERANCE, lazyTotalGzip, routes: sorted }, null, '\t') + '\n'
	);
	console.log(
		`size-budget: seeded ${Object.keys(sorted).length} routes, lazy total ${lazyTotalGzip} B`
	);
	process.exit(0);
}

const budget = JSON.parse(readFileSync(BUDGET, 'utf8'));
if (args.has('--update-lazy')) {
	console.log(
		`size-budget: lazy total ${budget.lazyTotalGzip} → ${lazyTotalGzip} B (${lazyTotalGzip - budget.lazyTotalGzip >= 0 ? '+' : ''}${lazyTotalGzip - budget.lazyTotalGzip})`
	);
	writeFileSync(BUDGET, JSON.stringify({ ...budget, lazyTotalGzip }, null, '\t') + '\n');
	process.exit(0);
}

const problems = [];
for (const [route, bytes] of Object.entries(sorted)) {
	const allowed = budget.routes[route];
	if (allowed === undefined)
		problems.push(`${route}: new route (${bytes} B) has no budget; run --update`);
	else if (bytes > allowed + budget.tolerance)
		problems.push(`${route}: ${bytes} B > budget ${allowed} B (+${bytes - allowed})`);
}
if (lazyTotalGzip > budget.lazyTotalGzip + budget.tolerance) {
	problems.push(
		`lazy total: ${lazyTotalGzip} B > ${budget.lazyTotalGzip} B (+${lazyTotalGzip - budget.lazyTotalGzip}); a new lazy dependency needs --update-lazy and a reason in the PR`
	);
}
const login = sorted['/(guest)/login'];
console.log(
	`size-budget: ${Object.keys(sorted).length} routes; /login ${login} B (budget ${budget.routes['/(guest)/login']} B); lazy total ${lazyTotalGzip} B`
);
if (problems.length) {
	for (const p of problems) console.error(`size-budget: ${p}`);
	process.exit(1);
}
