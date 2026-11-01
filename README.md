# Mese — organizator de mese

Aplicație web instalabilă pe telefon (PWA) pentru planificarea meselor în familie:

- **rețete cu poze**, ingrediente pe raioane și porții de bază;
- **plan** zilnic, săptămânal și calendar lunar;
- **mese din mai multe feluri**, fiecare masă cu propriul număr de porții, care recalculează cantitățile;
- **evenimente** cu aperitive, feluri principale, deserturi și băuturi, scalate după numărul de persoane;
- **listă de cumpărături** generată automat, grupată pe raioane, cu bife comune pentru toată familia.

Construită cu SvelteKit, PostgreSQL și Drizzle, pentru câțiva utilizatori, pe un server mic.

## Pornire rapidă

```bash
docker compose up -d --build     # http://localhost:3000
```

sau, pentru dezvoltare:

```bash
cp .env.example .env             # setează DATABASE_URL
npm install
npm run dev                      # http://localhost:5173
```

## Documentație

- [Documentație funcțională și tehnică](docs/DOCUMENTATIE.md)
- [Instrucțiuni de lansare (local și pe server)](docs/LANSARE.md)

## Comenzi

| Comandă | Ce face |
|---|---|
| `npm run dev` | server de dezvoltare |
| `npm run build` / `npm start` | build de producție și pornire |
| `npm run check` | verificare tipuri |
| `npm test` | teste unitare (+ integrare dacă e setat `TEST_DATABASE_URL`) |
| `npx playwright test` | teste e2e în Chrome (după `npm run build`) |
| `npm run db:generate` | generează o migrație după modificarea schemei |
