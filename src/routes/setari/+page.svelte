<script lang="ts">
	import { enhance } from '$app/forms';
	import PageHeader from '#lib/components/PageHeader.svelte';
	import Icon from '#lib/components/Icon.svelte';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
</script>

<svelte:head><title>Setări · Mese</title></svelte:head>

<PageHeader title="Setări" eyebrow={data.user?.name ?? ''} back="/plan" />

<section class="card stack">
	<h2>Membrii familiei</h2>
	<p class="small muted">Toți membrii văd și editează același plan, aceleași rețete și aceeași listă.</p>
	<ul class="users">
		{#each data.users as u (u.id)}
			<li>
				<Icon name="person" size={18} />
				<span class="grow">{u.name} <span class="small muted">{u.email}</span></span>
				{#if u.id !== data.user?.id}
					<form
						method="POST"
						action="?/removeUser"
						use:enhance={({ cancel }) => {
							if (!confirm(`Ștergi contul lui ${u.name}?`)) cancel();
						}}
					>
						<input type="hidden" name="user_id" value={u.id} />
						<button class="icon-btn plain" aria-label={`Șterge contul ${u.name}`}><Icon name="trash" size={16} /></button>
					</form>
				{:else}
					<span class="pill">tu</span>
				{/if}
			</li>
		{/each}
	</ul>
	{#if form?.addError}<p class="form-error">{form.addError}</p>{/if}
	{#if form?.addOk}<p class="form-ok">{form.addOk}</p>{/if}
	<form method="POST" action="?/addUser" class="stack" use:enhance>
		<h3>Adaugă un membru</h3>
		<label class="field">Nume<input type="text" name="name" required maxlength="80" /></label>
		<label class="field">Email<input type="email" name="email" required autocomplete="off" /></label>
		<label class="field">Parolă inițială (minim 10 caractere)<input type="password" name="password" required minlength="10" autocomplete="new-password" /></label>
		<button class="btn">Creează contul</button>
	</form>
</section>

<a class="card link-card" href="/produse" style="margin-top:16px">
	<Icon name="cart" size={20} />
	<span class="grow"><b>Produse</b><br /><span class="small muted">Catalogul de produse, raioane și unități</span></span>
	<Icon name="right" size={18} stroke={2} />
</a>

<section class="card stack" style="margin-top:16px">
	<h2>Schimbă parola</h2>
	{#if form?.pwError}<p class="form-error">{form.pwError}</p>{/if}
	{#if form?.pwOk}<p class="form-ok">{form.pwOk}</p>{/if}
	<form method="POST" action="?/password" class="stack" use:enhance>
		<label class="field">Parola actuală<input type="password" name="current" required autocomplete="current-password" /></label>
		<label class="field">Parola nouă<input type="password" name="next" required minlength="10" autocomplete="new-password" /></label>
		<button class="btn">Schimbă parola</button>
	</form>
</section>

<form method="POST" action="/logout" style="margin-top:16px" onsubmit={() => navigator.serviceWorker?.controller?.postMessage('clear-pages')}>
	<button class="btn secondary block"><Icon name="logout" size={18} />Ieși din cont</button>
</form>

<style>
	.link-card {
		display: flex;
		align-items: center;
		gap: 12px;
		color: var(--ink);
		text-decoration: none;
	}
	.link-card b {
		font-weight: 600;
	}
	.users {
		list-style: none;
		margin: 0;
		padding: 0;
	}
	.users li {
		display: flex;
		align-items: center;
		gap: 10px;
		min-height: 44px;
		border-bottom: 1px solid #f0ece3;
	}
</style>
