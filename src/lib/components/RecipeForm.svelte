<script lang="ts">
	import { enhance } from '$app/forms';
	import Icon from './Icon.svelte';
	import Photo from './Photo.svelte';
	import ProductPicker from './ProductPicker.svelte';
	import UnitSelect from './UnitSelect.svelte';
	import { AISLES, RECIPE_CATEGORIES } from '../constants';
	import { formatNumber } from '../units';

	type Ing = { productId?: number | null; name: string; quantity: number | null; unit: string | null; aisle: string | null };
	type Product = { id: number; name: string; aisle: string; unit: string };
	type Initial = {
		name: string;
		category: string;
		servings: number;
		prepMinutes: number | null;
		instructions: string;
		photo?: string | null;
		ingredients: Ing[];
	};

	let {
		initial,
		catalog,
		error = '',
		submitLabel = 'Salvează'
	}: { initial: Initial; catalog: Product[]; error?: string; submitLabel?: string } = $props();

	let uid = 0;
	type Row = { key: number; productId: number | null; name: string; qty: string; unit: string; aisle: string };
	const toRow = (i: Ing): Row => ({
		key: uid++,
		productId: i.productId ?? null,
		name: i.name,
		qty: i.quantity === null ? '' : formatNumber(i.quantity, 3),
		unit: i.unit ?? '',
		aisle: i.aisle ?? ''
	});
	const blank = (): Row => ({ key: uid++, productId: null, name: '', qty: '', unit: 'g', aisle: '' });

	// svelte-ignore state_referenced_locally
	let rows = $state<Row[]>(initial.ingredients.length ? initial.ingredients.map(toRow) : [blank(), blank(), blank()]);
	// Câmpurile au stare locală (bind:value), ca să nu fie rescrise la alte actualizări ale formularului.
	// svelte-ignore state_referenced_locally
	let category = $state(initial.category || 'fel_principal');
	// svelte-ignore state_referenced_locally
	let name = $state(initial.name);
	// svelte-ignore state_referenced_locally
	let prepMinutes = $state<number | null>(initial.prepMinutes);
	// svelte-ignore state_referenced_locally
	let servings = $state(initial.servings);
	// svelte-ignore state_referenced_locally
	let instructions = $state(initial.instructions);
	let preview = $state<string | null>(null);
	let removePhoto = $state(false);
	let busy = $state(false);
	let photoNote = $state('');

	/** La alegerea unui produs se preiau unitatea și raionul lui; pentru un produs nou se alege raionul în rând. */
	function onPick(row: Row, p: Product | null) {
		if (p) {
			row.unit = p.unit;
			row.aisle = p.aisle;
		} else if (!row.aisle) {
			row.aisle = '';
		}
	}

	/** Micșorează poza în browser (max. 1600 px, JPEG), ca încărcarea și stocarea să fie mici. */
	async function onPhoto(e: Event) {
		const input = e.currentTarget as HTMLInputElement;
		const file = input.files?.[0];
		photoNote = '';
		if (!file) return;
		removePhoto = false;
		try {
			const bitmap = await createImageBitmap(file);
			const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
			const canvas = document.createElement('canvas');
			canvas.width = Math.round(bitmap.width * scale);
			canvas.height = Math.round(bitmap.height * scale);
			canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
			const blob: Blob | null = await new Promise((r) => canvas.toBlob(r, 'image/jpeg', 0.82));
			if (blob && blob.size < file.size) {
				const dt = new DataTransfer();
				dt.items.add(new File([blob], 'poza.jpg', { type: 'image/jpeg' }));
				input.files = dt.files;
			}
			preview = URL.createObjectURL(input.files![0]);
		} catch {
			preview = URL.createObjectURL(file);
			photoNote = 'Poza va fi încărcată la dimensiunea originală.';
		}
	}
</script>

<form
	method="POST"
	enctype="multipart/form-data"
	class="stack"
	use:enhance={() => {
		busy = true;
		return async ({ update }) => {
			await update({ reset: false });
			busy = false;
		};
	}}
>
	{#if error}<p class="form-error" role="alert">{error}</p>{/if}

	<div class="photo-row">
		{#if preview && !removePhoto}
			<img src={preview} alt="Previzualizare" class="preview" />
		{:else}
			<Photo photo={removePhoto ? null : (initial.photo ?? null)} {category} size={96} radius={16} alt="Poza rețetei" />
		{/if}
		<div class="stack grow">
			<label class="btn secondary small file">
				<Icon name="camera" size={16} />
				{initial.photo || preview ? 'Schimbă poza' : 'Adaugă poză'}
				<input type="file" name="photo" accept="image/jpeg,image/png,image/webp" onchange={onPhoto} class="visually-hidden" />
			</label>
			{#if initial.photo}
				<label class="row small muted"><input type="checkbox" name="remove_photo" bind:checked={removePhoto} /> Șterge poza</label>
			{/if}
			{#if photoNote}<p class="small muted">{photoNote}</p>{/if}
		</div>
	</div>

	<label class="field">Nume
		<input type="text" name="name" required maxlength="120" bind:value={name} placeholder="de ex. Sarmale cu smântână" />
	</label>

	<div class="grid2">
		<label class="field">Categorie
			<select name="category" bind:value={category}>
				{#each RECIPE_CATEGORIES as c (c.id)}<option value={c.id}>{c.label}</option>{/each}
			</select>
		</label>
		<label class="field">Timp (minute)
			<input type="number" name="prep_minutes" min="0" max="1440" inputmode="numeric" bind:value={prepMinutes} />
		</label>
	</div>

	<label class="field">Cantitățile de mai jos sunt pentru câte porții?
		<input type="number" name="servings" min="1" max="100" inputmode="numeric" required bind:value={servings} />
	</label>

	<section class="stack">
		<h2>Ingrediente</h2>
		<p class="small muted">Alege produsele din catalog (<a href="/produse">gestionează produsele</a>). Un produs care lipsește se adaugă direct aici.</p>
		{#each rows as row, i (row.key)}
			{@const isNew = !row.productId && !!row.name.trim()}
			<div class="ing card">
				<div class="ing-name">
					<ProductPicker
						products={catalog}
						bind:productId={row.productId}
						bind:text={row.name}
						label={`Produsul ${i + 1}`}
						idName="ing_product"
						textName="ing_name"
						onpick={(p) => onPick(row, p)}
					/>
				</div>
				<input type="text" name="ing_qty" inputmode="decimal" placeholder="Cant." aria-label={`Cantitatea ${i + 1}`} bind:value={row.qty} class="ing-qty" />
				<div class="ing-unit"><UnitSelect name="ing_unit" label={`Unitatea ${i + 1}`} bind:value={row.unit} /></div>
				{#if isNew}
					<select name="ing_aisle" aria-label={`Raionul ${i + 1}`} bind:value={row.aisle} class="ing-aisle">
						<option value="">Raion pentru produsul nou…</option>
						{#each AISLES as a (a)}<option value={a}>{a}</option>{/each}
					</select>
				{:else}
					<input type="hidden" name="ing_aisle" value={row.aisle} />
					<span class="ing-aisle small muted aisle-label">{row.aisle}</span>
				{/if}
				<button type="button" class="icon-btn plain ing-del" aria-label={`Șterge rândul ${i + 1}`} onclick={() => (rows = rows.filter((r) => r.key !== row.key))}>
					<Icon name="close" size={18} />
				</button>
			</div>
		{/each}
		<button type="button" class="btn dashed" onclick={() => (rows = [...rows, blank()])}><Icon name="plus" size={18} stroke={2} />Adaugă ingredient</button>
	</section>

	<label class="field">Mod de preparare
		<textarea name="instructions" rows="8" placeholder="Pașii, câte unul pe rând" bind:value={instructions}></textarea>
	</label>

	<button class="btn block" disabled={busy}>{busy ? 'Se salvează…' : submitLabel}</button>
</form>

<style>
	.photo-row {
		display: flex;
		gap: 16px;
		align-items: center;
	}
	.preview {
		width: 96px;
		height: 96px;
		border-radius: 16px;
		object-fit: cover;
	}
	.file {
		align-self: flex-start;
		cursor: pointer;
	}
	.grid2 {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 12px;
	}
	.ing {
		display: grid;
		grid-template-columns: 76px 112px minmax(0, 1fr) 44px;
		grid-template-areas: 'name name name del' 'qty unit aisle aisle';
		gap: 8px;
		padding: 10px;
	}
	.ing-name { grid-area: name; }
	.ing-qty { grid-area: qty; }
	.ing-unit { grid-area: unit; }
	.ing-aisle { grid-area: aisle; }
	.ing-del { grid-area: del; }
	.aisle-label {
		align-self: center;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	@media (min-width: 620px) {
		.ing {
			grid-template-columns: minmax(0, 1fr) 76px 112px 150px 44px;
			grid-template-areas: 'name qty unit aisle del';
		}
	}
</style>
