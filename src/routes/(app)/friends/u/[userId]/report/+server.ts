import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireSocial } from '#lib/features/social/gates.server.js';
import { uuidParam } from '#lib/features/settings-admin/social/social.server.js';
import { respondRedirect, socialDo, socialErrorMessage } from '#lib/features/social/friends/friends.server.js';
import { SocialReportReasons } from '#lib/features/social/friends/types.js';

// POST /friends/u/{userId}/report (handlers.FriendReport): files a report
// and, when asked, blocks in the same step — only after the report is
// accepted, so a failed report never leaves a silent block.
export const POST: RequestHandler = async (event) => {
	await requireSocial(event);
	const userID = uuidParam(event.params.userId);
	if (!userID) error(400, 'Invalid user');
	const form = await event.request.formData();
	let reason = String(form.get('reason') ?? '');
	if (!SocialReportReasons.includes(reason)) reason = 'other';
	const report: { targetType: string; targetId: string; reason: string; note?: string } = {
		targetType: 'user',
		targetId: userID,
		reason
	};
	const note = String(form.get('note') ?? '').trim();
	if (note) {
		if (Array.from(note).length > 1000) {
			return respondRedirect(event, '/friends/u/' + userID, '', 'Keep the details under 1,000 characters.');
		}
		report.note = note;
	}
	try {
		await socialDo(event, 'POST', '/v1/social/reports', report);
	} catch (err) {
		return respondRedirect(event, '/friends/u/' + userID, '', socialErrorMessage(err, 'Could not send the report.'));
	}
	if (String(form.get('alsoBlock') ?? '') !== '') {
		try {
			await socialDo(event, 'POST', '/v1/social/blocks/' + userID);
		} catch (err) {
			return respondRedirect(event, '/friends/u/' + userID, 'Report sent.', socialErrorMessage(err, 'The report was sent, but blocking failed.'));
		}
		return respondRedirect(event, '/friends', "Thanks. We review every report within 24 hours. They're blocked.", '');
	}
	return respondRedirect(event, '/friends/u/' + userID, 'Thanks. We review every report within 24 hours.', '');
};
