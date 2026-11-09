import { sql } from 'drizzle-orm';
import {
	boolean,
	date,
	doublePrecision,
	index,
	integer,
	pgTable,
	serial,
	text,
	timestamp,
	uniqueIndex
} from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
	id: serial('id').primaryKey(),
	email: text('email').notNull().unique(),
	name: text('name').notNull(),
	passwordHash: text('password_hash').notNull(),
	createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
});

export const sessions = pgTable(
	'sessions',
	{
		/** SHA-256 al tokenului din cookie; tokenul în clar nu se salvează. */
		id: text('id').primaryKey(),
		userId: integer('user_id')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		expiresAt: timestamp('expires_at', { withTimezone: true }).notNull()
	},
	(t) => [index('sessions_user_idx').on(t.userId)]
);

/** Catalogul de produse: numele, raionul și unitatea propusă implicit. */
export const products = pgTable(
	'products',
	{
		id: serial('id').primaryKey(),
		name: text('name').notNull(),
		aisle: text('aisle').notNull().default('Altele'),
		unit: text('unit').notNull().default('buc'),
		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
	},
	(t) => [uniqueIndex('products_name_lower_idx').on(sql`lower(${t.name})`)]
);

export const recipes = pgTable('recipes', {
	id: serial('id').primaryKey(),
	name: text('name').notNull(),
	category: text('category').notNull(),
	/** Pentru câte porții sunt scrise cantitățile ingredientelor. */
	servings: integer('servings').notNull().default(4),
	prepMinutes: integer('prep_minutes'),
	instructions: text('instructions').notNull().default(''),
	photo: text('photo'),
	createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
	updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
});

export const recipeIngredients = pgTable(
	'recipe_ingredients',
	{
		id: serial('id').primaryKey(),
		recipeId: integer('recipe_id')
			.notNull()
			.references(() => recipes.id, { onDelete: 'cascade' }),
		position: integer('position').notNull().default(0),
		/** Produsul din catalog; numele și raionul de mai jos sunt copiate din el și ținute la zi. */
		productId: integer('product_id').references(() => products.id, { onDelete: 'restrict' }),
		name: text('name').notNull(),
		quantity: doublePrecision('quantity'),
		unit: text('unit'),
		aisle: text('aisle')
	},
	(t) => [index('recipe_ingredients_recipe_idx').on(t.recipeId), index('recipe_ingredients_product_idx').on(t.productId)]
);

export const meals = pgTable(
	'meals',
	{
		id: serial('id').primaryKey(),
		date: date('date', { mode: 'string' }).notNull(),
		mealType: text('meal_type').notNull(),
		time: text('time'),
		servings: integer('servings').notNull().default(2),
		note: text('note')
	},
	(t) => [index('meals_date_idx').on(t.date)]
);

export const mealDishes = pgTable(
	'meal_dishes',
	{
		id: serial('id').primaryKey(),
		mealId: integer('meal_id')
			.notNull()
			.references(() => meals.id, { onDelete: 'cascade' }),
		recipeId: integer('recipe_id')
			.notNull()
			.references(() => recipes.id, { onDelete: 'cascade' }),
		position: integer('position').notNull().default(0)
	},
	(t) => [index('meal_dishes_meal_idx').on(t.mealId)]
);

export const events = pgTable(
	'events',
	{
		id: serial('id').primaryKey(),
		date: date('date', { mode: 'string' }).notNull(),
		time: text('time'),
		name: text('name').notNull(),
		guests: integer('guests').notNull().default(6),
		note: text('note')
	},
	(t) => [index('events_date_idx').on(t.date)]
);

/**
 * Un element al evenimentului: fie o rețetă (scalată după numărul de persoane),
 * fie un produs liber, cu cantitate fixă (de exemplu „Vin roșu, 3 sticle”).
 */
export const eventItems = pgTable(
	'event_items',
	{
		id: serial('id').primaryKey(),
		eventId: integer('event_id')
			.notNull()
			.references(() => events.id, { onDelete: 'cascade' }),
		section: text('section').notNull(),
		recipeId: integer('recipe_id').references(() => recipes.id, { onDelete: 'cascade' }),
		name: text('name'),
		quantity: doublePrecision('quantity'),
		unit: text('unit'),
		aisle: text('aisle'),
		position: integer('position').notNull().default(0)
	},
	(t) => [index('event_items_event_idx').on(t.eventId)]
);

/** Bifele din lista de cumpărături, păstrate pe perioadă (de ex. „2026-11-02_2026-11-08”). */
export const shoppingChecks = pgTable(
	'shopping_checks',
	{
		id: serial('id').primaryKey(),
		period: text('period').notNull(),
		itemKey: text('item_key').notNull(),
		checked: boolean('checked').notNull().default(true)
	},
	(t) => [uniqueIndex('shopping_checks_period_item_idx').on(t.period, t.itemKey)]
);

/** Produse adăugate manual în lista unei perioade (detergent, pâine etc.). */
export const shoppingExtras = pgTable(
	'shopping_extras',
	{
		id: serial('id').primaryKey(),
		period: text('period').notNull(),
		name: text('name').notNull(),
		quantity: doublePrecision('quantity'),
		unit: text('unit'),
		aisle: text('aisle')
	},
	(t) => [index('shopping_extras_period_idx').on(t.period)]
);

/** Numărul implicit de porții pentru fiecare tip de masă (setare comună pentru toată familia). */
export const mealDefaults = pgTable('meal_defaults', {
	mealType: text('meal_type').primaryKey(),
	servings: integer('servings').notNull()
});
