<script lang="ts">
	import { enhance } from '$app/forms';
	import PageHeader from '#lib/components/PageHeader.svelte';
	import Photo from '#lib/components/Photo.svelte';
	import Icon from '#lib/components/Icon.svelte';
	import Stepper from '#lib/components/Stepper.svelte';
	import ProductPicker from '#lib/components/ProductPicker.svelte';
	import UnitSelect from '#lib/components/UnitSelect.svelte';
	import RecipePicker from '#lib/components/RecipePicker.svelte';
	import { AISLES, EVENT_SECTION_CATEGORIES, EVENT_SECTIONS, categoryLabel, eventSectionLabel } from '#lib/constants.ts';
	import { formatDayLong } from '#lib/dates.ts';
	import { aggregate } from '#lib/shopping.ts';
	import { formatQuantity, scaleFactor } from '#lib/units.ts';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
	const ev = $derived(data.event);

	// svelte-ignore state_referenced_locally
	let guests = $state(data.event.guests);
	$effect(() => {
		guests = data.event.guests;
	});

	let guestsForm: HTMLFormElement | undefined = $state();
	let timer: ReturnType<typeof setTimeout> | undefined;
	function onGuests() {
		clearTimeout(timer);
		timer = setTimeout(() => guestsForm?.requestSubmit(), 600);
	}

	const sections = $derived(
		EVENT_SECTIONS.map((s) => ({ ...s, items: ev.items.filter((i) => i.section === s.id) })).filter((s) => s.items.length)
	);

	const groups = $derived(
		aggregate(
			data.raw.map((r) => ({
				...r,
				quantity: r.quantity === null ? null : r.scale ? r.quantity * scaleFactor(guests, r.recipeServings) : r.quantity
			}))
		)
	);

	let adding = $state(false);
	let mode = $state<'reteta' | 'produs'>('reteta');
	let section = $state('principale');
	let pId = $state<number | null>(null);
	let pName = $state('');
	let pQty = $state('');
	let pUnit = $state('sticlă');
	let pAisle = $state('');
	let editing = $state(false);
	function openAdd(s: string) {
		section = s;
		mode = s === 'bauturi' ? 'produs' : 'reteta';
		adding = true;
	}
</script>

<svelte:head><title>{ev.name} · Mese</title></svelte:head>

<PageHeader title={ev.name} eyebrow="Eveniment" back={`/calendar?luna=${ev.date.slice(0, 7)}`}>
	{#snippet actions()}
		{#if !data.past}<button class="icon-btn" aria-label="Editează evenimentul" onclick={() => (editing = !editing)}><Icon name="edit" size={18} /></button>{/if}
	{/snippet}
</PageHeader>

<div class="chips">
	<a class="pill event" href={`/zi/${ev.date}`}>{formatDayLong(ev.date)}{ev.time ? ` · ${ev.time}` : ''}</a>
	<span class="pill event">{ev.items.length} {ev.items.length === 1 ? 'fel' : 'feluri și băuturi'}</span>
</div>

{#if ev.note}<p class="muted note">{ev.note}</p>{/if}

{#if data.past}
	<p class="past-note">Eveniment trecut: îl poți consulta, dar nu se mai poate modifica.</p>
{/if}

{#if editing && !data.past}
	<form
		method="POST"
		action="?/update"
		class="card stack"
		use:enhance={() =>
			async ({ update }) => {
				await update({ reset: false });
				editing = false;
			}}
	>
		<label class="field">Nume<input type="text" name="name" required maxlength="120" defaultValue={ev.name} /></label>
		<div class="grid2">
			<label class="field">Data<input type="date" name="date" required min={data.today} defaultValue={ev.date} /></label>
			<label class="field">Ora<input type="time" name="time" defaultValue={ev.time ?? ''} /></label>
		</div>
		<label class="field">Note<textarea name="note" rows="3" defaultValue={ev.note ?? ''}></textarea></label>
		<button class="btn">Salvează</button>
	</form>
{/if}

<form method="POST" action="?/guests" bind:this={guestsForm} use:enhance={() => async () => {}} class="guests">
	<div>
		<p class="label">Persoane</p>
		<p class="big">{guests} {guests === 1 ? 'persoană' : 'persoane'}</p>
	</div>
	{#if !data.past}<Stepper bind:value={guests} name="guests" min={1} max={500} label="persoane" onchange={onGuests} inverted />{/if}
</form>
<p class="small muted hint">Rețetele se scalează după numărul de persoane; băuturile și produsele rămân la cantitatea scrisă.</p>

{#if form?.message}<p class="form-error">{form.message}</p>{/if}

{#each sections as s (s.id)}
	<section class="block">
		<div class="spread">
			<h2>{s.label}</h2>
			{#if !data.past}<button class="btn small dashed" onclick={() => openAdd(s.id)} aria-label={`Adaugă la ${s.label}`}><Icon name="plus" size={14} stroke={2.4} />Adaugă</button>{/if}
		</div>
		{#if s.items.some((i) => i.recipeId)}
			<ul class="tiles">
				{#each s.items.filter((i) => i.recipeId) as it (it.id)}
					<li class="tile">
						<a href={`/retete/${it.recipeId}`} class="tile-link">
							<Photo photo={it.photo} category={it.category ?? 'fel_principal'} size={84} width="100%" radius={12} alt={it.name} />
							<span class="tname">{it.name}</span>
						</a>
						{#if !data.past}<form method="POST" action="?/removeItem" use:enhance class="rm">
							<input type="hidden" name="item_id" value={it.id} />
							<button aria-label={`Scoate ${it.name}`}><Icon name="close" size={14} stroke={2.4} /></button>
						</form>{/if}
					</li>
				{/each}
			</ul>
		{/if}
		{#each s.items.filter((i) => !i.recipeId) as it (it.id)}
			<div class="product">
				<span class="pic"><Icon name={s.id === 'bauturi' ? 'glass' : 'cart'} size={16} /></span>
				<span class="grow">{it.name}</span>
				<span class="muted">{formatQuantity(it.quantity, it.unit)}</span>
				{#if !data.past}
					<form method="POST" action="?/removeItem" use:enhance>
						<input type="hidden" name="item_id" value={it.id} />
						<button class="icon-btn plain" aria-label={`Scoate ${it.name}`}><Icon name="close" size={16} /></button>
					</form>
				{/if}
			</div>
		{/each}
	</section>
{/each}

{#if !ev.items.length && !adding && !data.past}
	<div class="empty block">Adaugă aperitive, feluri principale, deserturi și băuturi.</div>
{/if}

{#if !data.past}
<section class="block">
	{#if adding}
		<div class="card stack">
			<div class="spread">
				<h2>Adaugă la eveniment</h2>
				<button class="icon-btn plain" aria-label="Închide" onclick={() => (adding = false)}><Icon name="close" size={18} /></button>
			</div>
			<label class="field">Secțiunea
				<select bind:value={section}>
					{#each EVENT_SECTIONS as s (s.id)}<option value={s.id}>{s.label}</option>{/each}
				</select>
			</label>
			<div class="seg" role="tablist">
				<button role="tab" aria-selected={mode === 'reteta'} class:on={mode === 'reteta'} onclick={() => (mode = 'reteta')}>Din rețete</button>
				<button role="tab" aria-selected={mode === 'produs'} class:on={mode === 'produs'} onclick={() => (mode = 'produs')}>Produs sau băutură</button>
			</div>

			{#if mode === 'reteta'}
				{#key section}
				<RecipePicker recipes={data.recipes} suggested={EVENT_SECTION_CATEGORIES[section] ?? []} suggestedLabel={`Pentru ${eventSectionLabel(section).toLowerCase()}`}>
					{#snippet item(r)}
						<form method="POST" action="?/addRecipe" use:enhance>
							<input type="hidden" name="section" value={section} />
							<input type="hidden" name="recipe_id" value={r.id} />
							<button class="opt-btn">
								<Photo photo={r.photo} category={r.category} size={40} radius={10} alt="" />
								<span class="grow">{r.name}<br /><span class="small muted">{categoryLabel(r.category)} · pentru {r.servings}</span></span>
								<Icon name="plus" size={18} stroke={2} />
							</button>
						</form>
					{/snippet}
				</RecipePicker>
				{/key}
			{:else}
				<form
					method="POST"
					action="?/addProduct"
					class="stack"
					use:enhance={() =>
						async ({ result, update }) => {
							await update();
							if (result.type === 'success') {
								pId = null;
								pName = '';
								pQty = '';
							}
						}}
				>
					<input type="hidden" name="section" value={section} />
					<div class="field">
						<span>Produs</span>
						<ProductPicker
							products={data.catalog}
							bind:productId={pId}
							bind:text={pName}
							label="Produs"
							idName="product_id"
							textName="name"
							placeholder="de ex. Vin roșu"
							required
							onpick={(p) => {
								if (p) {
									pUnit = p.unit;
									pAisle = p.aisle;
								}
							}}
						/>
					</div>
					<div class="grid3">
						<label class="field">Cantitate<input type="text" name="quantity" inputmode="decimal" placeholder="3" bind:value={pQty} /></label>
						<label class="field">Unitate<UnitSelect name="unit" label="Unitate" bind:value={pUnit} /></label>
						<label class="field">Raion
							<select name="aisle" bind:value={pAisle}>
								<option value="">auto</option>
								{#each AISLES as a (a)}<option value={a}>{a}</option>{/each}
							</select>
						</label>
					</div>
					<button class="btn">Adaugă</button>
				</form>
			{/if}
		</div>
	{:else}
		<button class="btn dashed block" onclick={() => openAdd('principale')}><Icon name="plus" size={18} stroke={2} />Adaugă fel sau băutură</button>
	{/if}
</section>
{/if}

<section class="block stack">
	<div class="spread">
		<h2>Produse necesare</h2>
		<span class="small muted">pentru {guests} persoane</span>
	</div>
	{#if groups.length}
		<div class="card">
			{#each groups as g (g.aisle)}
				<p class="aisle">{g.aisle}</p>
				{#each g.items as i (i.key)}
					<div class="ing"><span>{i.name}</span><span class="qty">{i.display}</span></div>
				{/each}
			{/each}
		</div>
		<a class="btn secondary" href={`/cumparaturi?de=${ev.date}&pana=${ev.date}`}><Icon name="cart" size={18} />Lista de cumpărături a zilei</a>
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
		if (!confirm('Ștergi evenimentul cu tot ce conține?')) cancel();
	}}
>
	<button class="btn danger block"><Icon name="trash" size={18} />Șterge evenimentul</button>
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
	.chips {
		display: flex;
		gap: 8px;
		flex-wrap: wrap;
		margin-bottom: 12px;
	}
	.chips a {
		text-decoration: none;
	}
	.note {
		margin-bottom: 12px;
	}
	.guests {
		background: var(--event);
		color: #fff;
		border-radius: var(--radius);
		padding: 12px 14px;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
		margin-top: 4px;
	}
	.label {
		font-size: 12px;
		text-transform: uppercase;
		letter-spacing: 1px;
		color: #fbefe0;
	}
	.big {
		font-family: var(--serif);
		font-size: 22px;
		font-weight: 600;
	}
	.hint {
		margin: 8px 2px 4px;
	}
	.block {
		margin-top: 22px;
	}
	.tiles {
		list-style: none;
		margin: 10px 0 0;
		padding: 0;
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
		gap: 12px;
	}
	.tile {
		position: relative;
	}
	.tile-link {
		display: flex;
		flex-direction: column;
		gap: 5px;
		color: var(--ink);
		text-decoration: none;
	}
	.tname {
		font-size: 13px;
		line-height: 1.25;
	}
	.rm {
		position: absolute;
		top: 4px;
		right: 4px;
	}
	.rm button {
		width: 28px;
		height: 28px;
		border-radius: 14px;
		border: none;
		background: rgba(255, 255, 255, 0.92);
		color: var(--ink);
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
	}
	.product {
		display: flex;
		align-items: center;
		gap: 10px;
		min-height: 44px;
		font-size: 14px;
	}
	.pic {
		width: 30px;
		height: 30px;
		border-radius: 8px;
		background: #d9e6ec;
		color: #2f5a6b;
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
	}
	.seg {
		display: grid;
		grid-template-columns: 1fr 1fr;
		border: 1px solid var(--line-strong);
		border-radius: 22px;
		padding: 3px;
	}
	.seg button {
		height: 38px;
		border: none;
		border-radius: 19px;
		background: transparent;
		font: 500 14px var(--sans);
		color: var(--ink);
		cursor: pointer;
	}
	.seg button.on {
		background: var(--accent);
		color: #fff;
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
	.aisle {
		font-family: var(--serif);
		font-weight: 600;
		font-size: 15px;
		margin-top: 8px;
	}
	.aisle:first-child {
		margin-top: 0;
	}
	.ing {
		display: flex;
		justify-content: space-between;
		gap: 12px;
		padding: 7px 0;
		border-bottom: 1px solid #f0ece3;
		font-size: 14px;
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
	.grid3 {
		display: grid;
		grid-template-columns: 76px 112px minmax(0, 1fr);
		gap: 10px;
	}
</style>
