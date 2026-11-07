# Mese — documentație funcțională și tehnică

Aplicație web (PWA) pentru organizarea meselor unei familii: rețete cu poze, plan zilnic, săptămânal și lunar, mese compuse din mai multe feluri, porții care recalculează cantitățile, evenimente cu multe feluri și băuturi, și listă de cumpărături generată automat.

Este gândită pentru **câțiva utilizatori** (o familie) care împart aceleași date, pe un server mic cu memorie limitată.

---

## Partea 1 — Documentație funcțională

### 1.1 Concepte

| Concept | Ce înseamnă |
|---|---|
| **Rețetă** | Un fel de mâncare sau o băutură: nume, categorie, poză, timp de preparare, mod de preparare și ingrediente. Cantitățile sunt scrise pentru un număr de porții de bază (de ex. „pentru 4”). |
| **Ingredient** | Un rând din rețetă: produs, cantitate (opțională), unitate și raionul din magazin. |
| **Masă** | O masă dintr-o zi (mic dejun, prânz, gustare, cină sau altă masă), cu oră, notă și **număr propriu de porții**. Conține unul sau mai multe **feluri** (rețete). |
| **Eveniment** | O ocazie din calendar (cină cu prietenii, zi de naștere) cu dată, oră, număr de persoane și o listă de elemente pe secțiuni: aperitive, feluri principale, garnituri și salate, deserturi, băuturi, altele. Un element este fie o rețetă, fie un produs liber cu cantitate fixă (de ex. „Vin roșu, 3 sticle”). |
| **Lista de cumpărături** | Toate produsele necesare într-o perioadă, adunate din mese, evenimente și adăugiri manuale, grupate pe raioane. |

### 1.2 Navigare

Bara de jos are patru secțiuni: **Plan**, **Calendar**, **Rețete**, **Cumpărături**. Setările (membrii familiei, parola, ieșirea din cont) se deschid din pictograma roată de pe pagina Plan.

### 1.3 Funcționalități

**Prima pornire și conturi**
- La instalarea automată, primul cont se creează din secretele GitHub. Altfel, la prima deschidere aplicația cere crearea lui (`/setup`). După ce există un cont, pagina nu mai este disponibilă.
- Din Setări se adaugă alți membri ai familiei (nume, email, parolă inițială), se șterg conturi și se schimbă parola proprie.
- Toți membrii văd și editează aceleași date.
- Sesiunea durează 30 de zile și se prelungește automat la folosire.

**Rețete**
- Listă cu poze, căutare după nume și filtrare pe categorii (mic dejun, supă/ciorbă, fel principal, garnitură, salată, aperitiv, patiserie, desert, gustare, băutură).
- Adăugare și editare: poză (făcută cu telefonul sau aleasă din galerie), nume, categorie, timp, porții de bază, ingrediente, mod de preparare.
- Poza se micșorează automat în browser (maxim 1600 px, JPEG) înainte de încărcare.
- La ingrediente se completează automat numele produselor folosite deja și raionul lor.
- Pagina rețetei are un selector de porții care recalculează pe loc cantitățile.
- „Adaugă în plan” pune rețeta într-o masă dintr-o zi aleasă; dacă masa nu există, este creată.
- Ștergerea unei rețete avertizează dacă rețeta e folosită în mese sau evenimente.
- Rețetele fără poză afișează un desen colorat după categorie.

**Plan săptămânal**
- Cele 7 zile ale săptămânii, de luni până duminică, cu pozele felurilor, mesele și evenimentele fiecărei zile; ziua de azi este evidențiată.
- Navigare între săptămâni și link direct la lista de cumpărături a săptămânii.
- Dacă săptămâna e goală, se poate copia săptămâna precedentă.

**Ziua**
- Bandă cu zilele săptămânii, mesele zilei (cu feluri, poze și porții) și evenimentele.
- „Adaugă o masă”: tipul mesei (se propune primul tip care lipsește), ora (propusă după tip), porțiile și o notă.

**Masa**
- Selectorul de porții salvează automat noul număr după scurt timp.
- Lista felurilor: fiecare fel duce la rețeta lui și poate fi scos din masă.
- „Adaugă un fel” deschide o listă de rețete cu căutare; se pot adăuga mai multe la rând.
- „Produse necesare” arată cantitățile totale ale mesei, scalate la porțiile ei.
- Masa se poate edita (tip, oră, notă) sau șterge.

**Calendar și evenimente**
- Calendarul lunii arată zilele planificate (punct verde) și zilele cu evenimente (pătrat colorat), plus lista evenimentelor lunii.
- Evenimentul nou are nume, dată, oră, număr de persoane și note.
- În eveniment se adaugă, pe secțiuni, rețete (din colecție) sau produse/băuturi cu cantitate fixă.
- **Rețetele se scalează după numărul de persoane**; produsele libere rămân la cantitatea scrisă.
- „Produse necesare” arată totalul evenimentului, grupat pe raioane.
- Evenimentul apare și în planul săptămânii și în pagina zilei.

**Lista de cumpărături**
- Implicit pentru săptămâna curentă; se poate trece la perioada anterioară sau următoare ori alege orice interval (maxim 63 de zile).
- Produsele identice se adună chiar dacă vin din rețete diferite sau au unități convertibile (g/kg, ml/l).
- Fiecare rând arată de unde vine produsul (rețeta sau evenimentul și ziua).
- Bifele se salvează pe server, deci sunt aceleași pe toate telefoanele familiei.
- Bifatele se pot ascunde.
- Lista se poate trimite ca text (Telegram, Viber, notițe), fără produsele bifate.
- Se pot adăuga produse manual (pâine, detergent) pentru perioada respectivă.

**Aplicație instalabilă (PWA)**
- Se poate instala pe ecranul principal al telefonului („Adaugă pe ecranul principal”).
- Fișierele aplicației sunt păstrate local.
- Paginile deschise recent se pot revedea fără conexiune; un banner anunță lipsa conexiunii.
- Modificările (de exemplu bifele) necesită conexiune.

### 1.4 Reguli de calcul

- **Scalare:** `cantitate × porții dorite ÷ porții de bază ale rețetei`. La mese contează porțiile mesei, la evenimente numărul de persoane.
- **Adunare:** produsele se potrivesc după nume (fără diferențe de majuscule sau spații) și unitate; kg se transformă în g și l în ml înainte de adunare. Unitățile diferite (de ex. „cană” și „l”) rămân rânduri separate.
- **Rotunjire „de bucătărie”:**
  - g și ml: la 5 sub 100 și la 10 peste.
  - bucăți: în sus, la jumătate până la 2, apoi la întreg.
  - linguri și căni: la sfert.
  - Peste 1000 g sau 1000 ml se afișează în kg sau l.
- **Fără cantitate:** produsele „după gust” apar o singură dată, fără cantitate.

---

## Partea 2 — Documentație tehnică

### 2.1 Arhitectură

```
Browser / PWA (Svelte 5)  ──HTTPS──▶  Caddy (reverse proxy, TLS)  ──▶  meals-app (Node 22, SvelteKit)  ──▶  PostgreSQL 16
                                                                        │
                                                                        └── volum /data/uploads (pozele)
```

Este un **monolit**: un singur container Node servește atât interfața (randare pe server și hidratare în browser), cât și logica și accesul la baza de date. Nu există API separat, cozi sau cache extern; pentru câțiva utilizatori nu ar aduce nimic în plus, iar memoria serverului e limitată.

### 2.2 Tehnologii

| Zonă | Alegere |
|---|---|
| Framework | SvelteKit 3 + Svelte 5 (runes), `@sveltejs/adapter-node` |
| Limbaj | TypeScript |
| Bază de date | PostgreSQL 16, driver `postgres` (postgres.js), ORM Drizzle |
| Migrații | `drizzle-kit generate` → SQL în `drizzle/`, aplicate automat la pornire |
| Autentificare | proprie: parole cu `scrypt` (Node crypto), sesiuni în tabel, cookie `httpOnly` |
| Fonturi | Fraunces și Inter, găzduite local (`@fontsource`), fără cereri externe |
| Teste | Vitest (unitare și integrare cu PostgreSQL), Playwright (e2e în Chrome, ecran de telefon) |
| Livrare | imagine Docker în GHCR, GitHub Actions, Docker Compose pe server |

### 2.3 Structura proiectului

```
src/
  app.css, app.html            stil global „Caiet”, șablon HTML
  hooks.server.ts              migrații la pornire, sesiune, protejarea paginilor, antete de securitate
  service-worker/              cache pentru aplicație, poze și paginile vizitate
  lib/
    constants.ts               categorii, tipuri de mese, secțiuni de eveniment, raioane, unități
    dates.ts                   calcule cu date „YYYY-MM-DD” (UTC), formatare în română
    units.ts                   conversii, scalare, rotunjire, afișarea cantităților
    shopping.ts                agregarea listei de cumpărături și exportul ca text
    components/                Icon, Photo, Stepper, PageHeader, RecipeForm
    server/
      db/schema.ts, db/index.ts   schema Drizzle, conexiune, migrații
      auth.ts                  parole, sesiuni, limitarea încercărilor de autentificare
      data.ts                  interogările pe entități și calculul nevoilor de produse
      forms.ts                 validarea formularelor
      uploads.ts               salvarea și servirea pozelor
  routes/
    login, setup, logout, setari          conturi
    plan, zi/[date], masa/[id]            planificare
    calendar, evenimente/nou, evenimente/[id]
    retete, retete/nou, retete/[id], retete/[id]/editare
    cumparaturi
    uploads/[file]                        servirea pozelor (doar autentificat)
    health                                verificarea de sănătate pentru Docker
drizzle/                       migrațiile SQL
tests/unit, tests/integration, tests/e2e
deploy/                        șabloane pentru server (compose, Caddy, .env, backup)
```

### 2.4 Modelul de date

```
users ─┐
       └─< sessions

recipes ─< recipe_ingredients
   ▲  ▲
   │  └──────────────┐
meals ─< meal_dishes │
                     │
events ─< event_items (recipe_id opțional; altfel produs liber cu cantitate)

shopping_checks   (period, item_key) unic — bifele listei
shopping_extras   produse adăugate manual pe perioadă
```

| Tabel | Câmpuri principale |
|---|---|
| `users` | email unic, nume, `password_hash` (`scrypt$N$r$p$salt$hash`) |
| `sessions` | `id` = SHA-256 al tokenului din cookie, `user_id`, `expires_at` |
| `recipes` | nume, categorie, `servings` (porții de bază), `prep_minutes`, `instructions`, `photo` (nume fișier) |
| `recipe_ingredients` | `recipe_id`, poziție, nume, `quantity` (double, opțional), unitate, raion |
| `meals` | `date`, `meal_type`, `time` (HH:MM), `servings`, notă |
| `meal_dishes` | `meal_id`, `recipe_id`, poziție |
| `events` | `date`, `time`, nume, `guests`, notă |
| `event_items` | `event_id`, `section`, `recipe_id` sau (nume, cantitate, unitate, raion), poziție |
| `shopping_checks` | `period` („YYYY-MM-DD_YYYY-MM-DD”), `item_key` („nume normalizat|unitate”), `checked` |
| `shopping_extras` | `period`, nume, cantitate, unitate, raion |

**Ștergeri în cascadă:**
- Ștergerea unei rețete o scoate din mese și evenimente.
- Ștergerea unei mese sau a unui eveniment șterge și elementele lor.

### 2.5 Fluxuri importante

**Cererile și autentificarea** (`hooks.server.ts`)
1. La pornire (`init`), se aplică migrațiile și se șterg sesiunile expirate.
2. La fiecare cerere, cookie-ul `meals_session` se verifică în baza de date. Sesiunea se prelungește dacă mai are sub 15 zile.
3. Paginile neautentificate redirecționează la `/login?next=…`; cererile non-GET primesc 401.
4. Sunt publice doar `/login`, `/setup`, `/health`, manifestul, service worker-ul și fișierele statice.

**Formulare:** toate modificările folosesc *form actions* SvelteKit cu `use:enhance`, deci funcționează și fără JavaScript. Porțiile și bifele au actualizare optimistă în pagină.

**Lista de cumpărături** (`data.ts → shoppingNeeds`, `shopping.ts → aggregate`)
1. Se citesc ingredientele felurilor din mesele perioadei, scalate cu `porții masă ÷ porții rețetă`.
2. Se citesc ingredientele rețetelor din evenimente, scalate cu `persoane ÷ porții rețetă`.
3. Se adaugă produsele libere din evenimente și adăugirile manuale.
4. Rândurile se normalizează (nume, unitate de bază), se adună și se grupează pe raioane, în ordinea din magazin.

**Pozele**
- Se micșorează în browser, apoi se validează pe server după conținut (antetul fișierului JPEG, PNG sau WebP), nu după extensie; maximum 8 MB.
- Se salvează cu nume UUID în `UPLOAD_DIR` și se servesc prin `/uploads/[file]` doar utilizatorilor autentificați, cu cache „immutable”.
- La înlocuire sau ștergere, fișierul vechi se șterge.

**Service worker**
- Fișierele aplicației, cu hash în nume, vin din cache.
- Pozele: cache întâi.
- Paginile: rețea întâi, cu ultima versiune salvată ca rezervă când nu e conexiune.
- La ieșirea din cont, paginile salvate se șterg.

### 2.6 Securitate

- Parole `scrypt` cu sare aleatoare; minimum 10 caractere; comparare în timp constant.
- Tokenul de sesiune are 256 de biți aleatori; în baza de date se păstrează doar hash-ul lui.
- Cookie `httpOnly`, `SameSite=Lax`, `Secure` pe HTTPS.
- Limitarea încercărilor de autentificare: 8 încercări greșite în 15 minute, per IP + email (în memorie).
- Protecția CSRF: SvelteKit verifică originea formularelor. În producție originea se deduce din antetul `Host` trimis de Caddy, cu https; pentru rulările locale pe http sunt permise explicit originile de pe `localhost`.
- Antete de securitate: `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: same-origin`; `robots.txt` blochează indexarea.
- Pozele sunt validate după conținut și servite doar cu nume UUID; nu se acceptă căi arbitrare.
- Containerul rulează ca utilizator neprivilegiat (`node`). Baza de date nu se expune public.
- Repository-ul nu conține parole, chei, adrese sau nume de server: valorile reale stau doar în `.env` pe server și în secretele GitHub.

### 2.7 Configurare (variabile de mediu)

| Variabilă | Implicit | Rol |
|---|---|---|
| `DATABASE_URL` | — (obligatorie) | conexiunea PostgreSQL |
| `APP_TZ` | `Europe/Chisinau` | fusul orar pentru „azi” și săptămâna curentă |
| `UPLOAD_DIR` | `data/uploads` (`/data/uploads` în Docker) | directorul pozelor |
| `BODY_SIZE_LIMIT` | `10M` în Docker | dimensiunea maximă a cererilor (adapter-node) |
| `PORT` | `3000` | portul serverului |
| `DB_POOL_SIZE` | `5` | conexiuni simultane la baza de date |
| `SKIP_MIGRATIONS` | — | `true` dezactivează migrațiile automate la pornire |
| `MIGRATIONS_DIR` | `./drizzle` | locația migrațiilor, dacă e alta |
| `INITIAL_ADMIN_EMAIL`, `INITIAL_ADMIN_PASSWORD`, `INITIAL_ADMIN_NAME` | — | dacă baza nu are niciun cont, primul cont se creează la pornire din aceste valori (folosit de instalarea automată) |

### 2.8 Resurse

În producție, procesul Node folosește în jur de 70–110 MB RAM. Containerul are limită de 256 MB și `--max-old-space-size=160`. Imaginea finală conține doar dependențele de producție (aproximativ 22 MB de `node_modules`).

### 2.9 Teste

| Tip | Comandă | Ce acoperă |
|---|---|---|
| Unitare | `npm test` | unități și rotunjiri, agregarea listei, calcule cu date, parole |
| Integrare | `TEST_DATABASE_URL=… npm test` | migrații pe PostgreSQL real, mese cu mai multe feluri, porții, evenimente, lista agregată (baza indicată este golită!) |
| E2E | `npm run build && npx playwright test` | în Chrome, pe ecran de telefon: prima pornire, autentificare, rețete cu poză, masă cu porții salvate automat, eveniment cu băuturi, lista și bifele persistente, PWA și verificarea de sănătate |
| Tipuri | `npm run check` | svelte-check / TypeScript |

Testele e2e pornesc serverul de producție (`node build`) pe portul 4173, cu baza din `E2E_DATABASE_URL` (implicit `postgres://meals:meals@127.0.0.1:5433/meals_e2e`), pe care o golesc înainte. Capturile de ecran se salvează în `test-results/screens/`.

### 2.10 Modificarea schemei

1. Modifică `src/lib/server/db/schema.ts`.
2. Rulează `npm run db:generate -- --name descriere`; se creează un fișier SQL nou în `drizzle/`.
3. Verifică SQL-ul generat, apoi fă commit cu el. La următoarea pornire, aplicația aplică migrația automat.
