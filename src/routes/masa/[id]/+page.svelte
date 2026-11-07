<script lang="ts">
	import { enhance } from '$app/forms';
	import PageHeader from '#lib/components/PageHeader.svelte';
	import Photo from '#lib/components/Photo.svelte';
	import Icon from '#lib/components/Icon.svelte';
	import Stepper from '#lib/components/Stepper.svelte';
	import { MEAL_TYPES, categoryLabel } from '#lib/constants.ts';
	import { formatDayLong } from '#lib/dates.ts';
	import { aggregate } from '#lib/shopping.ts';
	import { scaleFactor } from '#lib/units.ts';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
	const meal = $derived(data.meal);

	// svelte-ignore state_referenced_locally
	let servings = $state(data.meal.servings);
	$effect(() => {
		servings = data.meal.servings;
	});

	const groups = $derived(
		aggregate(
			data.raw.map((r) => ({
				...r,
				quantity: r.quantity === null ? null : r.quantity * scaleFactor(servings, r.recipeServings)
			}))
		)
	);

	// Porțiile se salvează automat la scurt timp după ultima apăsare.
	let servingsForm: HTMLFormElement | undefined = $state();
	let timer: ReturnType<typeof setTimeout> | undefined;
	let saveState = $state('');
	function onServings() {
		clearTimeout(timer);
		saveState = '';
		timer = setTimeout(() => servingsForm?.requestSubmit(), 600);
	}

	let filter = $state('');
	let picking = $state(false);
	const matches = $derived(
		data.recipes
			.filter((r) => !filter || r.name.toLowerCase().includes(filter.trim().toLowerCase()))
			.slice(0, 30)
	);
	let editing = $state(false);
</script>

<svelte:head><title>{meal.label} · {formatDayLong(meal.date)}</title></svelte:head>

<PageHeader title={meal.label} eyebrow={`${formatDayLong(meal.date)}${meal.time ? ` · ${meal.time}` : ''}`} back={`/zi/${meal.date}`}>
	{#snippet actions()}
		{#if !data.past}<button class="icon-btn" aria-label="Editează masa" onclick={() => (editing = !editing)}><Icon name="edit" size={18} /></button>{/if}
	{/snippet}
</PageHeader>

{#if data.past}
	<p class="past-note">Masă dintr-o zi trecută: o poți consulta, dar nu se mai poate modifica.</p>
{/if}

{#if editing && !data.past}
	<form
		method="POST"
		action="?/update"
		class="card stack edit"
		use:enhance={() =>
			async ({ update }) => {
				await update({ reset: false });
				editing = false;
			}}
	>
		<div class="grid2">
			<label class="field">Masa
				<select name="meal_type">
					{#each MEAL_TYPES as t (t.id)}<option value={t.id} selected={t.id === meal.mealType}>{t.label}</option>{/each}
				</select>
			</label>
			<label class="field">Ora<input type="time" name="time" defaultValue={meal.time ?? ''} /></label>
		</div>
		<label class="field">Notă<input type="text" name="note" maxlength="200" defaultValue={meal.note ?? ''} /></label>
		<button class="btn">Salvează</button>
	</form>
{/if}

<form
	method="POST"
	action="?/servings"
	bind:this={servingsForm}
	use:enhance={() =>
		async ({ result }) => {
			saveState = result.type === 'success' ? 'salvat' : 'eroare la salvare';
		}}
	class="servings"
>
	<div>
		<p class="label">Porții pentru această masă</p>
		<p class="big">{servings} {servings === 1 ? 'porție' : 'porții'} <span class="state" aria-live="polite">{saveState}</span></p>
	</div>
	{#if !data.past}<Stepper bind:value={servings} name="servings" min={1} max={100} onchange={onServings} inverted />{/if}
</form>

{#if meal.note}<p class="muted small" style="margin-top:10px">{meal.note}</p>{/if}

<section class="stack block">
	<h2>Felurile mesei</h2>
	{#if form?.message}<p class="form-error">{form.message}</p>{/if}
	{#each meal.dishes as d (d.id)}
		<div class="dish">
			<a href={`/retete/${d.recipeId}`} class="row grow link">
				<Photo photo={d.photo} category={d.category} size={64} radius={14} alt={d.name} />
				<div class="grow">
					<h3>{d.name}</h3>
					<p class="small muted">{categoryLabel(d.category)} · rețetă pentru {d.servings}</p>
				</div>
			</a>
			{#if !data.past}
				<form method="POST" action="?/removeDish" use:enhance>
					<input type="hidden" name="dish_id" value={d.id} />
					<button class="icon-btn plain" aria-label={`Scoate ${d.name}`}><Icon name="close" size={18} /></button>
				</form>
			{/if}
		</div>
	{:else}
		<p class="muted">Masa nu are încă feluri.</p>
	{/each}

	{#if picking && !data.past}
		<div class="card stack picker">
			<div class="spread">
				<h3>Alege o rețetă</h3>
				<button class="icon-btn plain" aria-label="Închide" onclick={() => (picking = false)}><Icon name="close" size={18} /></button>
			</div>
			<input type="search" placeholder="Caută…" bind:value={filter} aria-label="Caută rețeta" />
			{#if data.recipes.length === 0}
				<p class="small muted">Nu ai încă rețete. <a href="/retete/nou">Adaugă una</a>.</p>
			{/if}
			<ul class="options">
				{#each matches as r (r.id)}
					<li>
						<form method="POST" action="?/addDish" use:enhance class="opt">
							<input type="hidden" name="recipe_id" value={r.id} />
							<button class="opt-btn">
								<Photo photo={r.photo} category={r.category} size={40} radius={10} alt="" />
								<span class="grow">{r.name}<br /><span class="small muted">{categoryLabel(r.category)}</span></span>
								<Icon name="plus" size={18} stroke={2} />
							</button>
						</form>
					</li>
				{/each}
			</ul>
		</div>
	{:else if !data.past}
		<button class="btn dashed" onclick={() => (picking = true)}><Icon name="plus" size={18} stroke={2} />Adaugă un fel</button>
	{/if}
</section>

<section class="stack block">
	<div class="spread">
		<h2>Produse necesare</h2>
		<span class="small muted">pentru {servings} {servings === 1 ? 'porție' : 'porții'}</span>
	</div>
	{#if groups.length}
		<div class="card">
			{#each groups as g (g.aisle)}
				{#each g.items as i (i.key)}
					<div class="ing"><span>{i.name}</span><span class="qty">{i.display}</span></div>
				{/each}
			{/each}
		</div>
	{:else}
		<p class="muted small">Adaugă feluri ca să vezi produsele.</p>
	{/if}
</section>

{#if !data.past}
<form
	method="POST"
	action="?/delete"
	class="block"
	use:enhance={({ cancel }) => {
		if (!confirm('Ștergi această masă?')) cancel();
	}}
>
	<button class="btn danger block"><Icon name="trash" size={18} />Șterge masa</button>
</form>
{/if}

<style>
	.past-note {
		background: var(--ground);
		color: var(--muted);
		border-radius: 12px;
		padding: 10px 12px;
		font-size: 14px;
		margin-bottom: 12px;
	}
	.servings {
		background: var(--accent);
		color: #fff;
		border-radius: var(--radius);
		padding: 12px 14px;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
	}
	.label {
		font-size: 12px;
		text-transform: uppercase;
		letter-spacing: 1px;
		color: #e3ebdd;
	}
	.big {
		font-family: var(--serif);
		font-size: 22px;
		font-weight: 600;
	}
	.state {
		font-family: var(--sans);
		font-size: 12px;
		font-weight: 400;
		color: #e3ebdd;
	}
	.edit {
		margin-bottom: 12px;
	}
	.block {
		margin-top: 22px;
	}
	.dish {
		display: flex;
		align-items: center;
		gap: 8px;
	}
	.link {
		color: var(--ink);
		text-decoration: none;
		gap: 12px;
	}
	.options {
		list-style: none;
		margin: 0;
		padding: 0;
		max-height: 360px;
		overflow-y: auto;
	}
	.opt-btn {
		width: 100%;
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 8px 4px;
		border: none;
		border-bottom: 1px solid #f0ece3;
		background: transparent;
		text-align: left;
		font: inherit;
		color: var(--ink);
		cursor: pointer;
	}
	.opt-btn:hover {
		background: var(--ground);
	}
	.ing {
		display: flex;
		justify-content: space-between;
		gap: 12px;
		padding: 8px 0;
		border-bottom: 1px solid #f0ece3;
		font-size: 14px;
	}
	.ing:last-child {
		border-bottom: none;
	}
	.qty {
		font-weight: 600;
		color: var(--accent-dark);
		white-space: nowrap;
	}
	.grid2 {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 12px;
	}
</style>
