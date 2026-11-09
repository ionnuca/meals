<script lang="ts">
	import { enhance } from '$app/forms';
	import PageHeader from '#lib/components/PageHeader.svelte';
	import Photo from '#lib/components/Photo.svelte';
	import Stepper from '#lib/components/Stepper.svelte';
	import Icon from '#lib/components/Icon.svelte';
	import { MEAL_TYPES, categoryLabel } from '#lib/constants.ts';
	import { formatQuantity, scaleFactor } from '#lib/units.ts';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
	const r = $derived(data.recipe);

	// svelte-ignore state_referenced_locally
	let servings = $state(data.recipe.servings);
	const f = $derived(scaleFactor(servings, r.servings));
	const steps = $derived(r.instructions.split(/\n+/).map((s) => s.trim()).filter(Boolean));
	let showPlan = $state(false);
	let planType = $state('pranz');
</script>

<svelte:head><title>{r.name} · Mese</title></svelte:head>

<PageHeader title={r.name} eyebrow={categoryLabel(r.category)} back="/retete">
	{#snippet actions()}
		<a class="icon-btn" href={`/retete/${r.id}/editare`} aria-label="Editează rețeta"><Icon name="edit" size={18} /></a>
	{/snippet}
</PageHeader>

<div class="hero">
	<Photo photo={r.photo} category={r.category} size={240} width="100%" radius={20} alt={r.name} />
</div>

<div class="meta row">
	{#if r.prepMinutes}<span class="pill"><Icon name="clock" size={14} stroke={2} />{r.prepMinutes} min</span>{/if}
	<span class="pill"><Icon name="person" size={14} stroke={2} />rețetă pentru {r.servings}</span>
</div>

<section class="card stack">
	<div class="spread">
		<h2>Ingrediente</h2>
		<div class="row small muted">
			<Stepper bind:value={servings} min={1} max={100} />
		</div>
	</div>
	<p class="small muted">Cantități pentru {servings} {servings === 1 ? 'porție' : 'porții'}</p>
	{#if r.ingredients.length}
		<ul class="ings">
			{#each r.ingredients as i (i.id)}
				<li>
					<span>{i.name}</span>
					<span class="qty">{formatQuantity(i.quantity === null ? null : i.quantity * f, i.unit)}</span>
				</li>
			{/each}
		</ul>
	{:else}
		<p class="muted">Rețeta nu are ingrediente.</p>
	{/if}
</section>

{#if steps.length}
	<section class="stack" style="margin-top:20px">
		<h2>Mod de preparare</h2>
		<ol class="steps">
			{#each steps as s, i (i)}<li>{s}</li>{/each}
		</ol>
	</section>
{/if}

<section class="stack" style="margin-top:24px">
	{#if !showPlan}
		<button class="btn block" onclick={() => (showPlan = true)}><Icon name="calendar" size={18} />Adaugă în plan</button>
	{:else}
		<form method="POST" action="?/addToPlan" class="card stack" use:enhance>
			<h2>Adaugă în plan</h2>
			{#if form?.planError}<p class="form-error">{form.planError}</p>{/if}
			<div class="grid2">
				<label class="field">Ziua<input type="date" name="date" min={data.today} defaultValue={data.today} required /></label>
				<label class="field">Masa
					<select name="meal_type" bind:value={planType}>
						{#each MEAL_TYPES as m (m.id)}<option value={m.id}>{m.label}</option>{/each}
					</select>
				</label>
			</div>
			<label class="field">Porții (dacă masa e nouă)<input type="number" name="servings" min="1" max="100" value={data.mealDefaults[planType] ?? 2} /></label>
			<div class="row">
				<button class="btn grow">Adaugă</button>
				<button type="button" class="btn secondary" onclick={() => (showPlan = false)}>Renunță</button>
			</div>
		</form>
	{/if}

	<form
		method="POST"
		action="?/delete"
		use:enhance={({ cancel }) => {
			const msg = data.usage
				? `Rețeta e folosită în ${data.usage} mese/evenimente și va fi scoasă și de acolo. O ștergi?`
				: 'Ștergi rețeta?';
			if (!confirm(msg)) cancel();
		}}
	>
		<button class="btn danger block"><Icon name="trash" size={18} />Șterge rețeta</button>
	</form>
</section>

<style>
	.hero {
		margin-bottom: 12px;
	}
	.meta {
		margin-bottom: 16px;
		flex-wrap: wrap;
	}
	.ings {
		list-style: none;
		margin: 0;
		padding: 0;
	}
	.ings li {
		display: flex;
		justify-content: space-between;
		gap: 12px;
		padding: 9px 0;
		border-bottom: 1px solid #f0ece3;
	}
	.ings li:last-child {
		border-bottom: none;
	}
	.qty {
		font-weight: 600;
		color: var(--accent-dark);
		white-space: nowrap;
	}
	.steps {
		margin: 0;
		padding-left: 22px;
		display: flex;
		flex-direction: column;
		gap: 10px;
	}
	.grid2 {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 12px;
	}
</style>
