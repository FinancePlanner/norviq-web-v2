<script lang="ts">
	// components.PasswordToggle — the raw Show/Hide overlay glyph for a password
	// Field (deliberately not a button role). Pair it with the Field's type:
	//   <div class="relative"><Field type={visible ? 'text' : 'password'} … /><PasswordToggle bind:visible /></div>
	let { visible = $bindable(false) }: { visible?: boolean } = $props();
</script>

<button
	type="button"
	class="absolute bottom-0 right-3 h-9 text-sm font-medium text-muted-foreground hover:opacity-100"
	onclick={() => (visible = !visible)}
	aria-label={visible ? 'Hide password' : 'Show password'}>{visible ? 'Hide' : 'Show'}</button
>
