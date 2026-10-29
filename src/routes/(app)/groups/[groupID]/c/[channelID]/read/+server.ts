import { text, type RequestHandler } from '@sveltejs/kit';
import { requireGroups } from '#lib/features/social/gates.server.js';
import { markGroupChannelRead } from '#lib/features/social/groups/groups.server.js';
import { uuidParam } from '#lib/features/settings-admin/social/social.server.js';

// GroupsMarkRead moves the viewer's read marker; the backend only moves it
// forward and syncs the viewer's other devices.
export const POST: RequestHandler = async (event) => {
	await requireGroups(event);
	const channelID = uuidParam(event.params.channelID);
	const form = await event.request.formData();
	const raw = String(form.get('seq') ?? '');
	const seq = /^[+-]?\d+$/.test(raw) ? Number(raw) : NaN;
	if (!channelID || !Number.isSafeInteger(seq) || seq <= 0) return text('bad request', { status: 400 });
	try {
		await markGroupChannelRead(event, channelID, seq);
	} catch {
		return new Response(null, { status: 502 });
	}
	return new Response(null, { status: 204 });
};
