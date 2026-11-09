<script lang="ts">
	// Listă derulantă cu căutare pentru produsele din catalog.
	// Se poate alege un produs existent sau, dacă nu există, se propune adăugarea lui ca produs nou.
	import Icon from './Icon.svelte';

	type Product = { id: number; name: string; aisle: string; unit: string };

	let {
		products,
		productId = $bindable<number | null>(null),
		text = $bindable(''),
		label,
		idName = undefined,
		textName = undefined,
		placeholder = 'Alege produsul',
		required = false,
		onpick = undefined
	}: {
		products: Product[];
		productId?: number | null;
		text?: string;
		label: string;
		idName?: string;
		textName?: string;
		placeholder?: string;
		required?: boolean;
		onpick?: (p: Product | null) => void;
	} = $props();

	const uid = `pp-${Math.random().toString(36).slice(2, 9)}`;
	let open = $state(false);
	let active = $state(0);
	let input: HTMLInputElement | undefined = $state();

	const fold = (s: string) => s.toLocaleLowerCase('ro-RO').normalize('NFD').replace(/[̀-ͯ]/g, '').trim();

	const selected = $derived(products.find((p) => p.id === productId) ?? null);
	const query = $derived(selected && selected.name === text ? '' : fold(text));
	const matches = $derived.by(() => {
		if (!query) return products.slice(0, 200);
		const starts = products.filter((p) => fold(p.name).startsWith(query));
		const contains = products.filter((p) => !fold(p.name).startsWith(query) && fold(p.name).includes(query));
		return [...starts, ...contains].slice(0, 60);
	});
	const exact = $derived(products.find((p) => fold(p.name) === fold(text)) ?? null);
	const offerNew = $derived(!!text.trim() && !exact);
	const optionCount = $derived(matches.length + (offerNew ? 1 : 0));

	function pick(p: Product) {
		productId = p.id;
		text = p.name;
		open = false;
		onpick?.(p);
	}

	function pickNew() {
		productId = null;
		text = text.trim();
		open = false;
		onpick?.(null);
	}

	function onInput() {
		if (selected && text !== selected.name) productId = null;
		open = true;
		active = 0;
	}

	function onBlur() {
		// lasă timp clic-ului pe o opțiune
		setTimeout(() => {
			if (!open) return;
			open = false;
			if (!productId && exact) pick(exact);
			else if (!productId && text.trim()) onpick?.(null);
		}, 150);
	}

	function onKey(e: KeyboardEvent) {
		if (e.key === 'ArrowDown') {
			e.preventDefault();
			open = true;
			active = Math.min(active + 1, optionCount - 1);
		} else if (e.key === 'ArrowUp') {
			e.preventDefault();
			active = Math.max(active - 1, 0);
		} else if (e.key === 'Enter' && open) {
			e.preventDefault();
			if (active < matches.length) pick(matches[active]);
			else if (offerNew) pickNew();
		} else if (e.key === 'Escape') {
			open = false;
		}
	}

	$effect(() => {
		if (!open) return;
		document.getElementById(`${uid}-opt-${active}`)?.scrollIntoView({ block: 'nearest' });
	});
</script>

<div class="picker">
	<div class="field-wrap">
		<input
			bind:this={input}
			type="text"
			role="combobox"
			aria-label={label}
			aria-expanded={open}
			aria-controls={`${uid}-list`}
			aria-autocomplete="list"
			aria-activedescendant={open && optionCount ? `${uid}-opt-${active}` : undefined}
			autocomplete="off"
			{placeholder}
			{required}
			bind:value={text}
			oninput={onInput}
			onfocus={() => (open = true)}
			onblur={onBlur}
			onkeydown={onKey}
		/>
		<button
			type="button"
			class="toggle"
			class:open
			tabindex="-1"
			aria-label={`Arată lista: ${label}`}
			onmousedown={(e) => e.preventDefault()}
			onclick={() => {
				open = !open;
				input?.focus();
			}}
		>
			<Icon name="right" size={16} stroke={2} />
		</button>
	</div>
	{#if idName}<input type="hidden" name={idName} value={productId ?? ''} />{/if}
	{#if textName}<input type="hidden" name={textName} value={text} />{/if}

	{#if open && optionCount}
		<ul class="list" id={`${uid}-list`} role="listbox" aria-label={label}>
			{#each matches as p, i (p.id)}
				<li
					id={`${uid}-opt-${i}`}
					role="option"
					aria-selected={i === active}
					class:active={i === active}
					onmousedown={(e) => e.preventDefault()}
					onclick={() => pick(p)}
					onkeydown={() => {}}
				>
					<span class="grow">{p.name}</span>
					<span class="meta">{p.aisle}</span>
				</li>
			{/each}
			{#if offerNew}
				<li
					id={`${uid}-opt-${matches.length}`}
					role="option"
					aria-selected={active === matches.length}
					class="new"
					class:active={active === matches.length}
					onmousedown={(e) => e.preventDefault()}
					onclick={pickNew}
					onkeydown={() => {}}
				>
					<Icon name="plus" size={14} stroke={2.4} /> Produs nou: „{text.trim()}”
				</li>
			{/if}
		</ul>
	{/if}
</div>

<style>
	.picker {
		position: relative;
		min-width: 0;
	}
	.field-wrap {
		position: relative;
	}
	.field-wrap input {
		padding-right: 40px;
	}
	.toggle {
		position: absolute;
		right: 2px;
		top: 50%;
		transform: translateY(-50%) rotate(90deg);
		width: 40px;
		height: 40px;
		border: none;
		background: transparent;
		color: var(--muted);
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		transition: transform 0.15s;
	}
	.toggle.open {
		transform: translateY(-50%) rotate(-90deg);
	}
	.list {
		position: absolute;
		z-index: 30;
		left: 0;
		right: 0;
		top: calc(100% + 4px);
		max-height: 260px;
		overflow-y: auto;
		margin: 0;
		padding: 4px;
		list-style: none;
		background: var(--card);
		border: 1px solid var(--line-strong);
		border-radius: 12px;
		box-shadow: 0 8px 24px rgba(34, 38, 31, 0.12);
	}
	li {
		display: flex;
		align-items: center;
		gap: 8px;
		min-height: 40px;
		padding: 6px 10px;
		border-radius: 8px;
		cursor: pointer;
		font-size: 15px;
	}
	li.active {
		background: var(--accent-soft);
	}
	.meta {
		font-size: 12px;
		color: var(--muted);
		white-space: nowrap;
	}
	.new {
		color: var(--accent-dark);
		font-weight: 600;
	}
</style>
