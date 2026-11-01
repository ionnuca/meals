<script lang="ts">
	import { enhance } from '$app/forms';
	import PageHeader from '#lib/components/PageHeader.svelte';
	import Stepper from '#lib/components/Stepper.svelte';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
	// svelte-ignore state_referenced_locally
	let guests = $state(form?.values?.guests ?? 8);
</script>

<svelte:head><title>Eveniment nou · Mese</title></svelte:head>

<PageHeader title="Eveniment nou" eyebrow="Calendar" back="/calendar" />

<form method="POST" class="stack" use:enhance>
	{#if form?.message}<p class="form-error" role="alert">{form.message}</p>{/if}
	<label class="field">Nume
		<input type="text" name="name" required maxlength="120" placeholder="de ex. Cina cu prietenii" defaultValue={form?.values?.name ?? ''} />
	</label>
	<div class="grid2">
		<label class="field">Data<input type="date" name="date" required defaultValue={form?.values?.date ?? data.date} /></label>
		<label class="field">Ora<input type="time" name="time" defaultValue={form?.values?.time ?? '19:00'} /></label>
	</div>
	<div class="field-like">
		<span>Persoane</span>
		<Stepper bind:value={guests} name="guests" min={1} max={500} label="persoane" />
	</div>
	<label class="field">Note (opțional)
		<textarea name="note" rows="3" maxlength="1000" defaultValue={form?.values?.note ?? ''}></textarea>
	</label>
	<button class="btn block">Creează evenimentul</button>
</form>

<style>
	.grid2 {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 12px;
	}
	.field-like {
		display: flex;
		align-items: center;
		justify-content: space-between;
		font-size: 13px;
		font-weight: 600;
		color: var(--muted);
	}
</style>
