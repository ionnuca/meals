<script lang="ts">
	import { enhance } from '$app/forms';
	import PageHeader from '#lib/components/PageHeader.svelte';
	import Photo from '#lib/components/Photo.svelte';
	import Icon from '#lib/components/Icon.svelte';
	import Stepper from '#lib/components/Stepper.svelte';
	import { MEAL_ORDER, MEAL_TYPES, categoryLabel, mealTypeLabel } from '#lib/constants.ts';
	import { dayNumber, formatDayLong, startOfWeek, WEEKDAYS_SHORT } from '#lib/dates.ts';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	let adding = $state(false);
	let mealType = $state('pranz');
	let servings = $state(2);
	let time = $state('');
	// ora și porțiile se propun după tipul mesei (porțiile din Setări), dar pot fi schimbate
	$effect(() => {
		time = MEAL_TYPES.find((m) => m.id === mealType)?.time ?? '';
		servings = data.mealDefaults[mealType] ?? 2;
	});
	const used = $derived(new Set(data.meals.map((m) => m.mealType)));

	// Mesele zilnice din Setări care nu există încă apar ca locuri goale (doar de azi înainte).
	const slots = $derived(
		data.past
			? []
			: data.dailyTypes
					.filter((t) => !used.has(t))
					.map((t) => ({
						type: t,
						label: mealTypeLabel(t),
						time: MEAL_TYPES.find((m) => m.id === t)?.time ?? '',
						servings: data.mealDefaults[t] ?? 2
					}))
	);
	type Entry = { kind: 'meal'; key: string; order: number; meal: (typeof data.meals)[number] } | { kind: 'slot'; key: string; order: number; slot: (typeof slots)[number] };
	const entries = $derived<Entry[]>(
		[
			...data.meals.map((m) => ({ kind: 'meal' as const, key: `m${m.id}`, order: MEAL_ORDER[m.mealType] ?? 9, meal: m })),
			...slots.map((s) => ({ kind: 'slot' as const, key: `s${s.type}`, order: MEAL_ORDER[s.type] ?? 9, slot: s }))
		].sort((a, b) => a.order - b.order)
	);

	$effect(() => {
		// la deschiderea formularului, propune prima masă care lipsește
		if (adding) {
			const free = MEAL_TYPES.find((m) => m.id !== 'alta' && !used.has(m.id));
			mealType = free?.id ?? 'alta';
		}
	});
</script>

<svelte:head><title>{formatDayLong(data.date)} · Mese</title></svelte:head>

<PageHeader title={formatDayLong(data.date)} eyebrow="Meniul zilei" back={`/plan?s=${startOfWeek(data.date)}`} />

<nav class="strip" aria-label="Zilele săptămânii">
	{#each data.week as d, i (d)}
		<a href={`/zi/${d}`} class:on={d === data.date} class:today={d === data.today} class:past={d < data.today} aria-current={d === data.date ? 'page' : undefined}>
			<span class="wd">{WEEKDAYS_SHORT[i]}</span>
			<span class="dn">{dayNumber(d)}</span>
		</a>
	{/each}
</nav>

<div class="stack">
	{#each data.events as e (e.id)}
		<a class="event" href={`/evenimente/${e.id}`}>
			<Icon name="star" size={18} />
			<span class="grow"><b>{e.name}</b> · {e.time ? `${e.time} · ` : ''}{e.guests} persoane</span>
			<Icon name="right" size={16} stroke={2} />
		</a>
	{/each}

	{#each entries as entry (entry.key)}
		{#if entry.kind === 'slot'}
			{@const sl = entry.slot}
			<form method="POST" action="?/addMeal" class="card slot" use:enhance>
				<input type="hidden" name="slot" value="1" />
				<input type="hidden" name="meal_type" value={sl.type} />
				<input type="hidden" name="time" value={sl.time} />
				<input type="hidden" name="servings" value={sl.servings} />
				<div class="spread">
					<p class="small"><span class="mt">{sl.label}</span>{#if sl.time}<span class="muted"> · {sl.time}</span>{/if}</p>
					<span class="pill muted-pill"><Icon name="person" size={14} stroke={2} />{sl.servings} {sl.servings === 1 ? 'porție' : 'porții'}</span>
				</div>
				<button class="btn small dashed" aria-label={`Adaugă feluri la ${sl.label.toLowerCase()}`}><Icon name="plus" size={16} stroke={2.2} />Adaugă feluri</button>
			</form>
		{:else}
		{@const m = entry.meal}
		<a class="card meal" href={`/masa/${m.id}`}>
			<div class="spread">
				<p class="small"><span class="mt">{m.label}</span>{#if m.time}<span class="muted"> · {m.time}</span>{/if}</p>
				<span class="pill"><Icon name="person" size={14} stroke={2} />{m.servings} {m.servings === 1 ? 'porție' : 'porții'}</span>
			</div>
			{#if m.note}<p class="small muted">{m.note}</p>{/if}
			{#each m.dishes as d (d.id)}
				<div class="dish">
					<Photo photo={d.photo} category={d.category} size={56} alt={d.name} />
					<div class="grow">
						<h3>{d.name}</h3>
						<p class="small muted">{categoryLabel(d.category)}{d.prepMinutes ? ` · ${d.prepMinutes} min` : ''}</p>
					</div>
				</div>
			{:else}
				<p class="small muted">Niciun fel încă · atinge ca să adaugi</p>
			{/each}
		</a>
		{/if}
	{/each}

	{#if data.past}
		<p class="past-note">Zi trecută: o poți consulta, dar nu se mai poate planifica.</p>
	{/if}

	{#if !data.meals.length && !data.events.length && !slots.length && !adding}
		<div class="empty">{data.past ? 'Nu a fost nimic planificat în această zi.' : 'Ziua e liberă. Adaugă prima masă.'}</div>
	{/if}

	{#if adding && !data.past}
		<form method="POST" action="?/addMeal" class="card stack" use:enhance>
			<h2>Masă nouă</h2>
			{#if form?.message}<p class="form-error">{form.message}</p>{/if}
			<div class="types" role="radiogroup" aria-label="Tipul mesei">
				{#each MEAL_TYPES as t (t.id)}
					<label class="type" class:on={mealType === t.id}>
						<input type="radio" name="meal_type" value={t.id} bind:group={mealType} class="visually-hidden" />{t.label}
					</label>
				{/each}
			</div>
			<div class="grid2">
				<label class="field">Ora<input type="time" name="time" bind:value={time} /></label>
				<div class="field"><span>Porții</span><Stepper bind:value={servings} name="servings" min={1} max={100} /></div>
			</div>
			<label class="field">Notă (opțional)<input type="text" name="note" maxlength="200" placeholder="de ex. la pachet" /></label>
			<div class="row">
				<button class="btn grow">Creează și adaugă feluri</button>
				<button type="button" class="btn secondary" onclick={() => (adding = false)}>Renunță</button>
			</div>
		</form>
	{:else if !data.past}
		<button class="btn dashed" onclick={() => (adding = true)}><Icon name="plus" size={18} stroke={2} />Adaugă o masă</button>
		<a class="btn secondary" href={`/evenimente/nou?data=${data.date}`}><Icon name="star" size={18} />Eveniment în această zi</a>
	{/if}
</div>

<style>
	.slot {
		display: flex;
		flex-direction: column;
		gap: 10px;
		border-style: dashed;
		background: transparent;
	}
	.slot .btn {
		align-self: flex-start;
	}
	.muted-pill {
		background: var(--ground);
		color: var(--muted);
	}
	.strip {
		display: grid;
		grid-template-columns: repeat(7, minmax(0, 1fr));
		gap: 4px;
		margin-bottom: 16px;
	}
	.strip a {
		height: 56px;
		border-radius: 14px;
		border: 1px solid var(--line);
		background: var(--card);
		color: var(--ink);
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 2px;
		text-decoration: none;
	}
	.strip a.today {
		border-color: var(--accent);
		border-width: 2px;
	}
	.strip a.past {
		color: var(--muted);
		background: var(--ground);
	}
	.past-note {
		background: var(--ground);
		color: var(--muted);
		border-radius: 12px;
		padding: 10px 12px;
		font-size: 14px;
	}
	.strip a.on {
		background: var(--accent);
		border-color: var(--accent);
		color: #fff;
	}
	.wd {
		font-size: 11px;
	}
	.dn {
		font-size: 16px;
		font-weight: 600;
	}
	.meal {
		display: flex;
		flex-direction: column;
		gap: 10px;
		color: var(--ink);
		text-decoration: none;
	}
	.meal:hover {
		border-color: var(--line-strong);
		color: var(--ink);
	}
	.mt {
		font-weight: 600;
		color: var(--accent);
		text-transform: uppercase;
		letter-spacing: 0.8px;
	}
	.dish {
		display: flex;
		align-items: center;
		gap: 12px;
	}
	.event {
		border-radius: 14px;
		background: var(--event-soft);
		color: var(--event-ink);
		padding: 12px 14px;
		display: flex;
		align-items: center;
		gap: 10px;
		font-size: 14px;
		text-decoration: none;
	}
	.event:hover {
		color: var(--event-ink);
	}
	.event b {
		font-weight: 600;
	}
	.types {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
	}
	.type {
		height: 40px;
		padding: 0 14px;
		border-radius: 20px;
		border: 1px solid var(--line-strong);
		display: inline-flex;
		align-items: center;
		font-size: 14px;
		cursor: pointer;
	}
	.type.on {
		background: var(--accent);
		border-color: var(--accent);
		color: #fff;
	}
	.type:focus-within {
		outline: 2px solid var(--accent);
		outline-offset: 2px;
	}
	.grid2 {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 12px;
		align-items: end;
	}
	.field {
		display: flex;
		flex-direction: column;
		gap: 6px;
		font-size: 13px;
		font-weight: 600;
		color: var(--muted);
	}
</style>
