<script lang="ts">
	import PageHeader from '#lib/components/PageHeader.svelte';
	import RecipeForm from '#lib/components/RecipeForm.svelte';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
</script>

<svelte:head><title>Editează · {data.recipe.name}</title></svelte:head>

<PageHeader title="Editează rețeta" back={`/retete/${data.recipe.id}`} />
{#key form}
	<RecipeForm initial={form?.values ?? data.recipe} catalog={data.catalog} error={form?.error ?? ''} />
{/key}
