import type { RequestHandler } from '@sveltejs/kit';
import script from '#lib/features/public/install.sh?raw';

// GET /install.sh — Go installScriptHandler (server.go): the MCP installer at a
// stable, unhashed URL. Printed in the setup panel and pasted into terminals,
// so it never gains a content hash and is never cached immutably. The script
// is norviq-web internal/server/static/install.sh, copied verbatim.
export const GET: RequestHandler = () =>
	new Response(script, { headers: { 'Content-Type': 'text/x-shellscript; charset=utf-8', 'Cache-Control': 'no-cache' } });
