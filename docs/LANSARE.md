# Instrucțiuni de lansare

Acest document descrie cum se pornește aplicația **local** (pentru dezvoltare sau probă) și **pe server** (producție, cu Docker).

> **Repository-ul este public.** Nu pune în git parole, chei SSH, fișiere `.env`, adresa IP sau numele serverului. Toate exemplele de mai jos folosesc valori de umplutură (`PAROLA_GENERATA`, `meals.exemplu.md`, `NUMELE_RETELEI_DOCKER`) pe care le înlocuiești doar pe server sau în secretele GitHub.

---

## 1. Cerințe

| Pentru | Ai nevoie de |
|---|---|
| Rulare locală fără Docker | Node.js 22+, PostgreSQL 16 (sau 14+) |
| Rulare locală cu Docker | Docker cu Docker Compose |
| Server | Docker și Docker Compose, un reverse proxy cu HTTPS (Caddy) și PostgreSQL deja existente |

---

## 2. Rulare locală

### Varianta A — totul în Docker (cea mai simplă)

```bash
git clone https://github.com/ionnuca/meals.git
cd meals
docker compose up -d --build
```

Se deschide http://localhost:3000. La prima pornire aplicația creează tabelele și cere crearea primului cont.

Comenzi utile:
```bash
docker compose logs -f app        # jurnalul aplicației
docker compose down               # oprire (datele rămân în volume)
docker compose down -v            # oprire și ștergerea datelor locale
```

Fișierul `docker-compose.yml` din rădăcină e **doar pentru proba locală**: parola bazei de acolo este una de test.

### Varianta B — Node.js + PostgreSQL instalat local (pentru dezvoltare)

1. Creează baza de date:
   ```bash
   psql -U postgres -c "create user meals password 'meals-local'"
   psql -U postgres -c "create database meals owner meals"
   ```
2. Configurează mediul:
   ```bash
   cp .env.example .env
   # în .env: DATABASE_URL=postgres://meals:meals-local@localhost:5432/meals
   ```
3. Instalează dependențele și pornește serverul de dezvoltare:
   ```bash
   npm install
   npm run dev
   ```
   Aplicația pornește pe http://localhost:5173, cu reîncărcare automată.

4. Pentru o probă a versiunii de producție:
   ```bash
   npm run build
   npm start        # http://localhost:3000
   ```

### Teste

```bash
npm run check                                   # tipuri
npm test                                        # teste unitare
TEST_DATABASE_URL=postgres://meals:meals-local@localhost:5432/meals_test npm test   # + integrare (golește baza!)
npm run build && E2E_DATABASE_URL=postgres://meals:meals-local@localhost:5432/meals_e2e npx playwright test
```

Testele e2e folosesc Google Chrome instalat local. Ca să folosești Chromium-ul Playwright, rulează `npx playwright install chromium` și pornește testele cu `PW_CHANNEL=chromium`.

---

## 3. Lansare pe server (producție)

### 3.1 Cum arată

Pe server rulează deja un stack Docker cu **PostgreSQL** și **Caddy**. Aplicația meals se adaugă alături, fără să modifice stack-ul existent:

- container separat `meals-app`, în directorul propriu (de ex. `/opt/meals`), cu limită de memorie de 256 MB;
- bază de date nouă `meals`, cu utilizator propriu, în **PostgreSQL-ul existent** (fără container nou de bază);
- un site nou în Caddy, pe un subdomeniu propriu, cu HTTPS automat;
- imaginea vine din GitHub Container Registry (`ghcr.io/ionnuca/meals`) și se construiește automat la fiecare push pe `main`.

### 3.2 Pregătire, o singură dată

Comenzile se rulează pe server, ca administrator.

**1) DNS.** Adaugă o înregistrare `A` pentru subdomeniul ales (de ex. `meals.exemplu.md`), îndreptată spre IP-ul serverului.

**2) Rețeaua Docker comună.** Află rețeaua în care se află Caddy și PostgreSQL:
```bash
docker network ls
docker inspect <container-caddy> --format '{{json .NetworkSettings.Networks}}'
```
Notează numele rețelei (îl vei folosi ca `SHARED_NETWORK`) și numele containerului PostgreSQL (gazda din `DATABASE_URL`).

**3) Baza de date și utilizatorul.** Generează o parolă și creează baza în PostgreSQL-ul existent:
```bash
openssl rand -base64 24 | tr -d '/+=' | cut -c1-28     # parola nouă, o notezi doar în .env
docker exec -it <container-postgres> psql -U <admin-postgres> -c "create user meals password 'PAROLA_GENERATA'"
docker exec -it <container-postgres> psql -U <admin-postgres> -c "create database meals owner meals"
```

**4) Directorul aplicației.**
```bash
sudo mkdir -p /opt/meals/data/uploads /opt/meals/backups
sudo chown -R 1000:1000 /opt/meals/data       # utilizatorul „node” din container are UID 1000
cd /opt/meals
```
Copiază din repository:
- `deploy/docker-compose.prod.yml` → `/opt/meals/docker-compose.yml`
- `deploy/env.prod.example` → `/opt/meals/.env`
- opțional, `deploy/backup.sh` → `/opt/meals/backup.sh`

Completează `/opt/meals/.env`:
```env
DATABASE_URL=postgres://meals:PAROLA_GENERATA@<container-postgres>:5432/meals
SHARED_NETWORK=NUMELE_RETELEI_DOCKER
APP_TZ=Europe/Chisinau
BODY_SIZE_LIMIT=10M
MEALS_IMAGE=ghcr.io/ionnuca/meals:latest
```
Apoi protejează fișierul:
```bash
chmod 600 /opt/meals/.env
```

Dacă publicarea se face cu un utilizator separat (recomandat), dă-i acces la director:
```bash
sudo chown -R <utilizator-publicare> /opt/meals
```
`data/` rămâne cu UID 1000.

**5) Imaginea.** Pachetul `ghcr.io/ionnuca/meals` apare după primul push pe `main`.
- Dacă îl faci **public** (GitHub → Packages → meals → Package settings → Change visibility), serverul îl poate descărca fără autentificare.
- Dacă rămâne privat, autentifică Docker-ul pe server o singură dată, cu un token GitHub cu dreptul `read:packages`:
  ```bash
  echo <TOKEN> | docker login ghcr.io -u <utilizator-github> --password-stdin
  ```

**6) Pornirea aplicației.**
```bash
cd /opt/meals
docker compose pull
docker compose up -d
docker compose logs -f app      # așteaptă „migrațiile bazei de date sunt la zi” și „Listening on …”
```

**7) Site-ul în Caddy.** Pornește de la `deploy/meals.caddy.example`, înlocuiește domeniul și adaugă fișierul în locul din care Caddy-ul existent încarcă site-urile suplimentare (de ex. un fișier `*.caddy` importat din `Caddyfile`). Apoi reîncarcă Caddy, din directorul stack-ului existent:
```bash
docker compose exec caddy caddy reload --config /etc/caddy/Caddyfile
```
Configurația producției existente nu se modifică.

**8) Primul cont.** Deschide `https://<subdomeniul-tău>`, creează primul cont, apoi adaugă din Setări ceilalți membri ai familiei.

### 3.3 Publicare automată din GitHub (opțional, recomandat)

Workflow-ul `.github/workflows/ci.yml` are trei pași:

1. La orice push sau pull request: verificare tipuri, teste unitare, teste de integrare cu PostgreSQL, build și teste e2e în Chrome.
2. La push pe `main`: construiește imaginea Docker și o publică în GHCR (`:latest` și `:<commit>`).
3. Opțional: se conectează la server prin SSH și actualizează aplicația.

Pentru pasul 3, în GitHub → **Settings → Secrets and variables → Actions**:

| Tip | Nume | Valoare |
|---|---|---|
| Secret | `DEPLOY_HOST` | adresa serverului |
| Secret | `DEPLOY_USER` | utilizatorul de publicare (cu acces la Docker) |
| Secret | `DEPLOY_SSH_KEY` | cheia privată SSH a acelui utilizator, dedicată publicării |
| Variabilă | `DEPLOY_ENABLED` | `true` (până o setezi, pasul de publicare e sărit) |
| Variabilă | `DEPLOY_PATH` | opțional; implicit `/opt/meals` |

Valorile stau doar în GitHub și nu apar în cod sau în jurnale. La publicare, workflow-ul:
1. scrie în `.env` imaginea commit-ului (`MEALS_IMAGE`);
2. rulează `docker compose pull && docker compose up -d`;
3. așteaptă până când containerul este `healthy`.

Dacă secretele sunt deja definite pentru alt proiect, trebuie adăugate și în acest repository: secretele GitHub sunt per repository.

### 3.4 Actualizare manuală

```bash
cd /opt/meals
docker compose pull && docker compose up -d
```

Revenire la o versiune anterioară: pune în `.env` `MEALS_IMAGE=ghcr.io/ionnuca/meals:<commit-anterior>`, apoi `docker compose up -d`. Migrațiile sunt doar aditive, deci revenirea la o versiune veche funcționează cât timp nu s-au șters coloane.

### 3.5 Copii de siguranță

Datele aplicației sunt în **baza `meals`** și în **directorul `/opt/meals/data/uploads`** (pozele).

- Dacă serverul are deja un backup zilnic al PostgreSQL, verifică dacă include toate bazele (`pg_dumpall` sau o listă de baze). Dacă salvează doar baza altei aplicații, adaugă și `meals`.
- `deploy/backup.sh` face un `pg_dump` al bazei `meals` și o arhivă a pozelor, păstrate 14 zile:
  ```bash
  # în crontab-ul root (crontab -e):
  45 3 * * * PG_CONTAINER=<container-postgres> PG_USER=<admin-postgres> /opt/meals/backup.sh >> /opt/meals/backups/backup.log 2>&1
  ```
- Restaurare:
  ```bash
  docker exec -i <container-postgres> pg_restore -U <admin-postgres> -d meals --clean < /opt/meals/backups/meals-AAAA-LL-ZZ.dump
  tar -xzf /opt/meals/backups/uploads-AAAA-LL-ZZ.tar.gz -C /opt/meals
  ```
- Ține o copie și în afara serverului (de ex. descărcată periodic cu `scp` sau `rsync`).

### 3.6 Verificări și depanare

| Simptom | Ce verifici |
|---|---|
| Containerul repornește | `docker compose logs app`: de obicei `DATABASE_URL` greșit sau rețeaua `SHARED_NETWORK` nu e cea în care e PostgreSQL |
| 502 din Caddy | containerul se numește `meals-app` și e în aceeași rețea cu Caddy? `docker network inspect NUMELE_RETELEI_DOCKER` |
| „Cross-site POST form submissions are forbidden” | cererea nu trece prin Caddy cu HTTPS sau antetul `Host` e modificat. Aplicația se folosește doar prin `https://<subdomeniu>` |
| Poza nu se încarcă (413) | `BODY_SIZE_LIMIT` în `.env` și `request_body max_size` în Caddy |
| Pozele dispar după actualizare | volumul `./data:/data` din compose și drepturile directorului `data` (UID 1000) |
| Memorie | `docker stats meals-app`: în mod normal 70–120 MB, limita e 256 MB |

Verificare rapidă de sănătate:
```bash
docker compose ps                      # coloana STATUS trebuie să arate „healthy”
docker exec meals-app wget -qO- http://127.0.0.1:3000/health   # răspunde „ok”
```
