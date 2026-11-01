<script lang="ts">
	import PageHeader from '#lib/components/PageHeader.svelte';
	import RecipeForm from '#lib/components/RecipeForm.svelte';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
	const empty = { name: '', category: 'fel_principal', servings: 4, prepMinutes: null, instructions: '', photo: null, ingredients: [] };
</script>

<svelte:head><title>Rețetă nouă · Mese</title></svelte:head>

<PageHeader title="Rețetă nouă" back="/retete" />
{#key form}
	<RecipeForm initial={form?.values ?? empty} catalog={data.catalog} error={form?.error ?? ''} submitLabel="Salvează rețeta" />
{/key}
