// Scenariul complet, în browser real, pe ecran de telefon:
// cont nou → rețete cu poză → masă din două feluri cu porții → eveniment cu băuturi → listă de cumpărături.
import { expect, test, type Page } from '@playwright/test';
import path from 'node:path';

test.describe.configure({ mode: 'serial' });

const EMAIL = 'test@example.com';
const PASSWORD = 'parola-de-test-123';
const shots = (name: string) => path.join('test-results', 'screens', `${name}.png`);

function todayIso(): string {
	return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Chisinau' }).format(new Date());
}

async function login(page: Page) {
	await page.goto('/login');
	await page.getByLabel('Email').fill(EMAIL);
	await page.getByLabel('Parolă').fill(PASSWORD);
	await page.getByRole('button', { name: 'Intră' }).click();
	await expect(page).toHaveURL(/\/plan/);
}

async function addIngredient(page: Page, index: number, name: string, qty: string, unit: string, aisle: string) {
	await page.getByLabel(`Produsul ${index}`).fill(name);
	await page.getByLabel(`Cantitatea ${index}`).fill(qty);
	await page.getByLabel(`Unitatea ${index}`).fill(unit);
	await page.getByLabel(`Raionul ${index}`).selectOption(aisle);
}

test('prima pornire creează contul și protejează paginile', async ({ page }) => {
	await page.goto('/plan');
	await expect(page).toHaveURL(/\/setup/);
	await page.getByLabel('Nume').fill('Ion');
	await page.getByLabel('Email').fill(EMAIL);
	await page.getByLabel(/Parolă/).fill(PASSWORD);
	await page.getByRole('button', { name: 'Creează contul' }).click();
	await expect(page).toHaveURL(/\/plan/);
	await expect(page.getByText('Planul săptămânii')).toBeVisible();

	// după ce există un cont, /setup nu mai e disponibil
	await page.goto('/setup');
	await expect(page).toHaveURL(/\/(login|plan)/);
});

test('autentificarea greșită e respinsă', async ({ page }) => {
	await page.goto('/login');
	await page.getByLabel('Email').fill(EMAIL);
	await page.getByLabel('Parolă').fill('greșită-complet');
	await page.getByRole('button', { name: 'Intră' }).click();
	await expect(page.getByRole('alert')).toContainText('Email sau parolă greșită');
});

test('rețete cu poză și ingrediente', async ({ page }) => {
	await login(page);
	await page.goto('/retete/nou');
	await page.getByLabel('Nume', { exact: true }).fill('Ciorbă de perișoare');
	await page.getByLabel('Categorie').selectOption('supa');
	await page.getByLabel(/pentru câte porții/).fill('4');
	await page.locator('input[name="photo"]').setInputFiles('tests/e2e/fixtures/ciorba.jpg');
	await expect(page.getByAltText('Previzualizare')).toBeVisible();
	await addIngredient(page, 1, 'Carne tocată', '300', 'g', 'Carne și pește');
	await addIngredient(page, 2, 'Ceapă', '1', 'buc', 'Legume și fructe');
	await addIngredient(page, 3, 'Sare', '', 'după gust', 'Condimente');
	await page.getByLabel('Mod de preparare').fill('Fierbe legumele.\nAdaugă perișoarele.\nAcrește cu borș.');
	await page.getByRole('button', { name: 'Salvează rețeta' }).click();

	await expect(page.getByRole('heading', { name: 'Ciorbă de perișoare' })).toBeVisible();
	const img = page.locator('img[src^="/uploads/"]').first();
	await expect(img).toBeVisible();
	expect(await img.evaluate((el: HTMLImageElement) => el.naturalWidth)).toBeGreaterThan(100);
	await expect(page.getByText('300 g')).toBeVisible();

	// scalarea din pagina rețetei: 4 → 8 porții dublează cantitățile
	for (let i = 0; i < 4; i++) await page.getByRole('button', { name: 'Mai multe porții' }).click();
	await expect(page.getByText('600 g')).toBeVisible();
	await page.screenshot({ path: shots('03-reteta'), fullPage: true });

	await page.goto('/retete/nou');
	await page.getByLabel('Nume', { exact: true }).fill('Sarmale cu smântână');
	await page.getByLabel('Categorie').selectOption('fel_principal');
	await addIngredient(page, 1, 'Carne tocată', '0,5', 'kg', 'Carne și pește');
	await addIngredient(page, 2, 'Smântână', '300', 'g', 'Lactate și ouă');
	await addIngredient(page, 3, 'Ceapă', '2', 'buc', 'Legume și fructe');
	await page.getByRole('button', { name: 'Salvează rețeta' }).click();
	await expect(page.getByRole('heading', { name: 'Sarmale cu smântână' })).toBeVisible();

	await page.goto('/retete');
	await expect(page.getByText('2 în colecție')).toBeVisible();
	await page.screenshot({ path: shots('02-retete'), fullPage: true });
});

test('masă din două feluri, cu porții care schimbă cantitățile', async ({ page }) => {
	await login(page);
	await page.goto(`/zi/${todayIso()}`);
	await page.getByRole('button', { name: 'Adaugă o masă' }).click();
	await page.locator('label.type', { hasText: 'Prânz' }).click();
	for (let i = 0; i < 4; i++) await page.getByRole('button', { name: 'Mai multe porții' }).click(); // 2 → 6
	await page.getByRole('button', { name: 'Creează și adaugă feluri' }).click();
	await expect(page).toHaveURL(/\/masa\/\d+/);

	await page.getByRole('button', { name: 'Adaugă un fel' }).click();
	await page.getByRole('button', { name: /Ciorbă de perișoare/ }).click();
	await expect(page.locator('.dish', { hasText: 'Ciorbă de perișoare' })).toBeVisible();
	await page.getByRole('button', { name: /Sarmale cu smântână/ }).click();
	await expect(page.locator('.dish', { hasText: 'Sarmale cu smântână' })).toBeVisible();

	// 6 porții: carne (300 g + 500 g) × 1,5 = 1,2 kg
	const carne = page.locator('.ing', { hasText: 'Carne tocată' });
	await expect(carne).toContainText('1,2 kg');

	// 8 porții: 1,6 kg; porțiile se salvează automat
	await page.getByRole('button', { name: 'Mai multe porții' }).click();
	await page.getByRole('button', { name: 'Mai multe porții' }).click();
	await expect(carne).toContainText('1,6 kg');
	await expect(page.getByText('salvat')).toBeVisible();
	await page.screenshot({ path: shots('04-masa'), fullPage: true });

	await page.reload();
	await expect(page.locator('.big')).toContainText('8 porții');

	await page.goto(`/zi/${todayIso()}`);
	await expect(page.locator('.meal')).toContainText('8 porții');
	await page.screenshot({ path: shots('05-zi'), fullPage: true });
});

test('eveniment cu feluri și băuturi', async ({ page }) => {
	await login(page);
	await page.goto('/calendar');
	await page.getByRole('link', { name: 'Eveniment' }).click();
	await page.getByLabel('Nume').fill('Cina cu prietenii');
	await page.getByLabel('Data').fill(todayIso());
	for (let i = 0; i < 2; i++) await page.getByRole('button', { name: 'Mai multe persoane' }).click(); // 8 → 10
	await page.getByRole('button', { name: 'Mai puține persoane' }).click(); // 9
	await page.getByRole('button', { name: 'Mai puține persoane' }).click(); // 8
	await page.getByRole('button', { name: 'Creează evenimentul' }).click();
	await expect(page.getByRole('heading', { name: 'Cina cu prietenii' })).toBeVisible();
	await expect(page.locator('.guests .big')).toContainText('8 persoane');

	await page.getByRole('button', { name: 'Adaugă fel sau băutură' }).click();
	await page.getByRole('button', { name: /Sarmale cu smântână/ }).click();
	await expect(page.locator('.tile', { hasText: 'Sarmale cu smântână' })).toBeVisible();

	await page.getByRole('combobox', { name: 'Secțiunea' }).selectOption('bauturi');
	await page.getByRole('tab', { name: 'Produs sau băutură' }).click();
	await page.getByLabel('Produs').fill('Vin roșu sec');
	await page.getByLabel('Cantitate').fill('3');
	await page.getByLabel('Unitate').fill('sticlă');
	await page.getByRole('button', { name: 'Adaugă', exact: true }).click();
	await expect(page.locator('.product', { hasText: 'Vin roșu sec' })).toContainText('3 sticlă');

	// 8 persoane, rețetă pentru 4: carne 0,5 kg × 2 = 1 kg
	await expect(page.locator('.ing', { hasText: 'Carne tocată' })).toContainText('1 kg');
	await page.screenshot({ path: shots('06-eveniment'), fullPage: true });

	await page.goto('/calendar');
	await expect(page.locator('.ev-card', { hasText: 'Cina cu prietenii' })).toBeVisible();
	await page.screenshot({ path: shots('07-calendar'), fullPage: true });
});

test('lista de cumpărături adună mesele și evenimentele', async ({ page }) => {
	await login(page);
	await page.goto('/cumparaturi');
	const carne = page.locator('.item', { hasText: 'Carne tocată' });
	// masa (1,6 kg) + evenimentul (1 kg)
	await expect(carne).toContainText('2,6 kg');
	await expect(page.locator('.item', { hasText: 'Vin roșu sec' })).toContainText('3 sticlă');
	await expect(page.locator('.item', { hasText: 'Sare' })).toContainText('după gust');

	const ceapa = page.locator('.item', { hasText: 'Ceapă' });
	// ceapă: masa (1 + 2) × 2 = 6, evenimentul 2 × 2 = 4 → 10 buc
	await expect(ceapa).toContainText('10 buc');
	await ceapa.click();
	await expect(ceapa).toHaveAttribute('aria-pressed', 'true');
	await page.waitForTimeout(400);
	await page.reload();
	await expect(page.locator('.item', { hasText: 'Ceapă' })).toHaveAttribute('aria-pressed', 'true');

	await page.getByRole('button', { name: 'Adaugă un produs' }).click();
	await page.getByLabel('Produs').fill('Pâine');
	await page.getByLabel('Cantitate').fill('2');
	await page.getByLabel('Unitate').fill('buc');
	await page.getByLabel('Raion').selectOption('Panificație');
	await page.getByRole('button', { name: 'Adaugă', exact: true }).click();
	await expect(page.locator('.item', { hasText: 'Pâine' })).toContainText('2 buc');
	await page.getByRole('button', { name: 'Gata' }).click();
	await page.screenshot({ path: shots('08-cumparaturi'), fullPage: true });

	await page.goto('/plan');
	await expect(page.locator('.day.today')).toContainText('Ciorbă de perișoare · Sarmale cu smântână');
	await expect(page.locator('.day.today')).toContainText('Cina cu prietenii');
	await page.screenshot({ path: shots('01-plan'), fullPage: true });
});

function yesterdayIso(): string {
	const d = new Date(`${todayIso()}T12:00:00Z`);
	d.setUTCDate(d.getUTCDate() - 1);
	return d.toISOString().slice(0, 10);
}

test('zilele trecute nu se pot planifica, iar azi e evidențiat în calendar', async ({ page }) => {
	await login(page);
	const ieri = yesterdayIso();

	// pagina zilei de ieri: doar consultare
	await page.goto(`/zi/${ieri}`);
	await expect(page.getByText('Zi trecută')).toBeVisible();
	await expect(page.getByRole('button', { name: 'Adaugă o masă' })).toHaveCount(0);
	await expect(page.getByRole('link', { name: 'Eveniment în această zi' })).toHaveCount(0);

	// și serverul refuză, chiar dacă cererea e trimisă direct
	const result = await page.evaluate(async (date) => {
		const body = new FormData();
		body.set('meal_type', 'cina');
		body.set('servings', '2');
		const res = await fetch(`/zi/${date}?/addMeal`, { method: 'POST', body, headers: { 'x-sveltekit-action': 'true' } });
		return res.json();
	}, ieri);
	expect(result.type).toBe('failure');

	// evenimentul nou nu acceptă o dată din trecut
	await page.goto('/evenimente/nou');
	await expect(page.getByLabel('Data')).toHaveAttribute('min', todayIso());
	await page.getByLabel('Nume').fill('Eveniment în trecut');
	await page.getByLabel('Data').evaluate((el: HTMLInputElement, d) => {
		el.removeAttribute('min');
		el.value = d;
	}, ieri);
	await page.getByRole('button', { name: 'Creează evenimentul' }).click();
	await expect(page.getByRole('alert')).toContainText('Zilele trecute');

	// azi: celula din calendar e marcată distinct
	await page.goto('/calendar');
	const azi = page.locator('a.day[aria-current="date"]');
	await expect(azi).toHaveCount(1);
	await expect(azi).toHaveClass(/today/);
	expect(await azi.evaluate((el) => getComputedStyle(el).backgroundColor)).toBe('rgb(79, 107, 74)');
	await page.screenshot({ path: shots('09-calendar-azi'), fullPage: true });

	// azi rămâne planificabil
	await page.goto(`/zi/${todayIso()}`);
	await expect(page.getByRole('button', { name: 'Adaugă o masă' })).toBeVisible();
});

test('aplicația e instalabilă (manifest și service worker)', async ({ page, request }) => {
	const manifest = await request.get('/manifest.webmanifest');
	expect(manifest.ok()).toBe(true);
	expect((await manifest.json()).display).toBe('standalone');
	await login(page);
	const registered = await page.evaluate(async () => {
		const reg = await navigator.serviceWorker.ready;
		return !!reg.active;
	});
	expect(registered).toBe(true);
	const health = await request.get('/health');
	expect(await health.text()).toBe('ok');
});
