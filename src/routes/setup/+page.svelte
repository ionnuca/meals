<script lang="ts">
	import { enhance } from '$app/forms';
	import type { PageProps } from './$types';

	let { form }: PageProps = $props();
</script>

<svelte:head><title>Prima pornire · Mese</title></svelte:head>

<div class="auth">
	<p class="eyebrow">Prima pornire</p>
	<h1>Creează primul cont</h1>
	<p class="muted">Contul acesta poate adăuga apoi și alți membri ai familiei, din Setări.</p>
	<form method="POST" class="stack" use:enhance>
		{#if form?.message}<p class="form-error" role="alert">{form.message}</p>{/if}
		<label class="field">Nume
			<input type="text" name="name" autocomplete="name" required defaultValue={form?.name ?? ''} />
		</label>
		<label class="field">Email
			<input type="email" name="email" autocomplete="username" required defaultValue={form?.email ?? ''} />
		</label>
		<label class="field">Parolă (minim 10 caractere)
			<input type="password" name="password" autocomplete="new-password" minlength="10" required />
		</label>
		<button class="btn block">Creează contul</button>
	</form>
</div>

<style>
	.auth {
		max-width: 400px;
		margin: 0 auto;
		padding-top: 10vh;
		display: flex;
		flex-direction: column;
		gap: 10px;
	}
	form {
		margin-top: 14px;
	}
</style>
