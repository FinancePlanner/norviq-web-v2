import type { Actions, PageServerLoad } from './$types';
import type { components } from '#lib/api/schema.js';
import { apiJSON } from '#lib/server/api.js';
import { errorMessage } from '#lib/features/settings-admin/api-errors.js';

type FeedbackResponse = components['schemas']['FeedbackResponse'];

const feedbackTopics = [
	'General Feedback',
	'Feature Request',
	'Bug Report',
	'UI/UX Feedback',
	'Other'
];

export const load: PageServerLoad = async () => ({ topics: feedbackTopics });

export const actions: Actions = {
	// Go SettingsFeedbackSubmit: POST /settings/feedback, same URL.
	default: async (event) => {
		let form: FormData;
		try {
			form = await event.request.formData();
		} catch {
			return { success: false, message: 'Invalid form submission.' };
		}
		const topic = String(form.get('topic') ?? '').trim();
		const message = String(form.get('message') ?? '').trim();
		if (topic === '' || message === '')
			return { success: false, message: 'Topic and message are required.' };
		try {
			const resp = await apiJSON<FeedbackResponse>(event, 'POST', '/v1/feedback', {
				topic,
				message
			});
			const backendMessage = (resp?.message ?? '').trim();
			return {
				success: true,
				message: backendMessage !== '' ? backendMessage : 'Feedback sent. Thank you!'
			};
		} catch (err) {
			return { success: false, message: errorMessage(err, 'Could not send feedback.') };
		}
	}
};
