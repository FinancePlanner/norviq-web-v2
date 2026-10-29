<script lang="ts">
	// boards.templ reportForm(field, id, backURL): posts to /boards/report.
	import { enhance } from '$app/forms';
	import { NativeSelect, SecondarySubmitButton, withSpinner } from '#lib/components/norviq/index.js';
	import { reasonOptions } from './boards.js';

	let { field, id, backURL }: { field: 'post_id' | 'comment_id'; id: string; backURL: string } = $props();
</script>

<form method="post" action="/boards/report" class="space-y-2" use:enhance={withSpinner()}>
	<input type="hidden" name={field} value={id} />
	<input type="hidden" name="return_to" value={backURL} />
	<label class="block text-xs font-medium" for={'report-' + id}>Report</label>
	<NativeSelect id={'report-' + id} name="reason" class="field-input text-xs" options={reasonOptions()} />
	<SecondarySubmitButton fullWidth class="text-xs">Send report</SecondarySubmitButton>
</form>
