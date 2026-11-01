<script lang="ts">
	import { enhance } from '$app/forms';
	import type { PageProps } from './$types';

	let { form }: PageProps = $props();
	let busy = $state(false);
</script>

<svelte:head><title>Autentificare · Mese</title></svelte:head>

<div class="auth">
	<p class="eyebrow">Organizator de mese</p>
	<h1>Intră în cont</h1>
	<form
		method="POST"
		class="stack"
		use:enhance={() => {
			busy = true;
			return async ({ update }) => {
				await update();
				busy = false;
			};
		}}
	>
		{#if form?.message}<p class="form-error" role="alert">{form.message}</p>{/if}
		<label class="field">Email
			<input type="email" name="email" autocomplete="username" required defaultValue={form?.email ?? ''} />
		</label>
		<label class="field">Parolă
			<input type="password" name="password" autocomplete="current-password" required />
		</label>
		<button class="btn block" disabled={busy}>{busy ? 'Se verifică…' : 'Intră'}</button>
	</form>
</div>

<style>
	.auth {
		max-width: 400px;
		margin: 0 auto;
		padding-top: 12vh;
		display: flex;
		flex-direction: column;
		gap: 10px;
	}
	form {
		margin-top: 18px;
	}
</style>
