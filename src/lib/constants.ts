// Valori fixe folosite în toată aplicația (etichete în română).

export const RECIPE_CATEGORIES = [
	{ id: 'mic_dejun', label: 'Mic dejun', icon: 'plate' },
	{ id: 'supa', label: 'Supă / ciorbă', icon: 'bowl' },
	{ id: 'fel_principal', label: 'Fel principal', icon: 'plate' },
	{ id: 'garnitura', label: 'Garnitură', icon: 'plate' },
	{ id: 'salata', label: 'Salată', icon: 'bowl' },
	{ id: 'aperitiv', label: 'Aperitiv', icon: 'plate' },
	{ id: 'patiserie', label: 'Patiserie', icon: 'plate' },
	{ id: 'desert', label: 'Desert', icon: 'plate' },
	{ id: 'gustare', label: 'Gustare', icon: 'bowl' },
	{ id: 'bautura', label: 'Băutură', icon: 'glass' }
] as const;

export type RecipeCategory = (typeof RECIPE_CATEGORIES)[number]['id'];

/** Culori pentru locul pozei, câte una pe categorie (fundal, desen). */
export const CATEGORY_TINT: Record<string, [string, string]> = {
	mic_dejun: ['#F4E8C8', '#7A5B12'],
	supa: ['#F3E1CC', '#8A5A2B'],
	fel_principal: ['#EADFD3', '#6E4B33'],
	garnitura: ['#EEE6CF', '#6F5A1E'],
	salata: ['#DDE8D5', '#3F5E3A'],
	aperitiv: ['#EFE3D0', '#7A5222'],
	patiserie: ['#F1E2C7', '#7A4F12'],
	desert: ['#F2DCE0', '#8E3B4E'],
	gustare: ['#E6E2EE', '#4F3F78'],
	bautura: ['#D9E6EC', '#2F5A6B']
};

export function categoryLabel(id: string): string {
	return RECIPE_CATEGORIES.find((c) => c.id === id)?.label ?? id;
}

export function categoryIcon(id: string): 'plate' | 'bowl' | 'glass' {
	return (RECIPE_CATEGORIES.find((c) => c.id === id)?.icon ?? 'plate') as 'plate' | 'bowl' | 'glass';
}

export const MEAL_TYPES = [
	{ id: 'mic_dejun', label: 'Mic dejun', time: '08:00' },
	{ id: 'pranz', label: 'Prânz', time: '13:00' },
	{ id: 'gustare', label: 'Gustare', time: '16:30' },
	{ id: 'cina', label: 'Cină', time: '19:30' },
	{ id: 'alta', label: 'Altă masă', time: '' }
] as const;

export function mealTypeLabel(id: string): string {
	return MEAL_TYPES.find((m) => m.id === id)?.label ?? id;
}

export const MEAL_ORDER: Record<string, number> = { mic_dejun: 0, pranz: 1, gustare: 2, cina: 3, alta: 4 };

export const EVENT_SECTIONS = [
	{ id: 'aperitive', label: 'Aperitive' },
	{ id: 'principale', label: 'Feluri principale' },
	{ id: 'garnituri', label: 'Garnituri și salate' },
	{ id: 'deserturi', label: 'Deserturi' },
	{ id: 'bauturi', label: 'Băuturi' },
	{ id: 'altele', label: 'Altele' }
] as const;

export function eventSectionLabel(id: string): string {
	return EVENT_SECTIONS.find((s) => s.id === id)?.label ?? id;
}

export const AISLES = [
	'Legume și fructe',
	'Carne și pește',
	'Lactate și ouă',
	'Panificație',
	'Băcănie',
	'Condimente',
	'Conserve și murături',
	'Congelate',
	'Băuturi',
	'Altele'
] as const;

export const DEFAULT_AISLE = 'Altele';

export const UNITS = ['g', 'kg', 'ml', 'l', 'buc', 'lingură', 'linguriță', 'cană', 'legătură', 'cățel', 'pachet', 'sticlă', 'după gust'] as const;

/** Categoriile de rețete potrivite fiecărui tip de masă, în ordinea în care se propun. */
export const MEAL_TYPE_CATEGORIES: Record<string, string[]> = {
	mic_dejun: ['mic_dejun', 'patiserie', 'gustare', 'bautura'],
	pranz: ['supa', 'fel_principal', 'garnitura', 'salata', 'desert', 'bautura'],
	gustare: ['gustare', 'desert', 'patiserie', 'bautura'],
	cina: ['fel_principal', 'garnitura', 'salata', 'supa', 'desert', 'bautura'],
	alta: []
};

/** Categoriile de rețete potrivite fiecărei secțiuni a unui eveniment. */
export const EVENT_SECTION_CATEGORIES: Record<string, string[]> = {
	aperitive: ['aperitiv', 'salata', 'patiserie'],
	principale: ['fel_principal', 'supa', 'garnitura'],
	garnituri: ['garnitura', 'salata'],
	deserturi: ['desert', 'patiserie'],
	bauturi: ['bautura'],
	altele: []
};
