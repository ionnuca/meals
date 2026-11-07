#!/usr/bin/env bash
# Instalează sau actualizează aplicația Mese pe server. Scriptul poate fi rulat de mai multe ori:
# prima rulare creează tot ce lipsește, următoarele doar actualizează imaginea.
#
# Îl rulează workflow-ul GitHub (.github/workflows/ci.yml) prin SSH, cu un utilizator care are acces la Docker.
# Nu conține date despre server: totul vine din variabilele de mai jos.
#
# Obligatorii:
#   MEALS_DOMAIN     subdomeniul aplicației (de ex. meals.exemplu.md)
#   MEALS_IMAGE      imaginea de pornit (de ex. ghcr.io/ionnuca/meals:<commit>)
# Opționale:
#   APP_DIR          implicit /opt/meals
#   STACK_PROJECT    proiectul Docker Compose existent, cu PostgreSQL și Caddy (implicit ttm)
#   DB_SERVICE       serviciul PostgreSQL din acel proiect (implicit db)
#   CADDY_SERVICE    serviciul Caddy din acel proiect (implicit caddy)
#   SITES_DIR        directorul din care Caddy încarcă site-urile suplimentare (implicit /opt/ttm/sites)
#   CADDY_CONFIG     calea Caddyfile-ului în containerul Caddy (implicit /etc/caddy/Caddyfile)
#   INITIAL_ADMIN_EMAIL, INITIAL_ADMIN_PASSWORD, INITIAL_ADMIN_NAME   primul cont (doar la prima instalare)
#   GHCR_USER, GHCR_TOKEN   pentru descărcarea imaginii dacă pachetul e privat
set -euo pipefail

: "${MEALS_DOMAIN:?lipsește MEALS_DOMAIN}"
: "${MEALS_IMAGE:?lipsește MEALS_IMAGE}"
APP_DIR=${APP_DIR:-/opt/meals}
STACK_PROJECT=${STACK_PROJECT:-ttm}
DB_SERVICE=${DB_SERVICE:-db}
CADDY_SERVICE=${CADDY_SERVICE:-caddy}
SITES_DIR=${SITES_DIR:-/opt/ttm/sites}
CADDY_CONFIG=${CADDY_CONFIG:-/etc/caddy/Caddyfile}
HERE=$(cd "$(dirname "$0")" && pwd)

step() { printf '\n==> %s\n' "$*"; }
fail() { printf '\nEROARE: %s\n' "$*" >&2; exit 1; }

if ! [[ "$MEALS_DOMAIN" =~ ^[A-Za-z0-9.-]+$ ]]; then fail "MEALS_DOMAIN nu e un nume de domeniu valid"; fi
for v in INITIAL_ADMIN_EMAIL INITIAL_ADMIN_PASSWORD INITIAL_ADMIN_NAME; do
	case "${!v:-}" in *"'"*) fail "$v nu poate conține apostrof (')";; esac
done

# Rulează o comandă ca root printr-un container (utilizatorul de publicare are acces la Docker, nu neapărat sudo).
as_root() { docker run --rm -v /opt:/opt alpine:3 sh -c "$1"; }

container_of() {
	docker ps -q --filter "label=com.docker.compose.project=$STACK_PROJECT" --filter "label=com.docker.compose.service=$1" | head -n1
}

step "Verific stack-ul existent"
DB_CONTAINER=$(container_of "$DB_SERVICE")
CADDY_CONTAINER=$(container_of "$CADDY_SERVICE")
[ -n "$DB_CONTAINER" ] || fail "nu găsesc containerul PostgreSQL (proiect $STACK_PROJECT, serviciu $DB_SERVICE)"
[ -n "$CADDY_CONTAINER" ] || fail "nu găsesc containerul Caddy (proiect $STACK_PROJECT, serviciu $CADDY_SERVICE)"
NETWORK=$(docker inspect "$CADDY_CONTAINER" --format '{{range $k, $v := .NetworkSettings.Networks}}{{$k}} {{end}}' | awk '{print $1}')
docker inspect "$DB_CONTAINER" --format '{{range $k, $v := .NetworkSettings.Networks}}{{$k}} {{end}}' | grep -qw "$NETWORK" \
	|| fail "PostgreSQL și Caddy nu sunt în aceeași rețea Docker ($NETWORK)"
echo "rețea: $NETWORK"
awk '/MemAvailable/ { printf "memorie disponibilă: %d MB\n", $2 / 1024 }' /proc/meminfo

step "Pregătesc directorul $APP_DIR"
# Directorul și .env aparțin utilizatorului de publicare; data/ aparține utilizatorului din container (UID 1000).
if [ ! -d "$APP_DIR" ] || [ ! -w "$APP_DIR" ] || { [ -f "$APP_DIR/.env" ] && [ ! -w "$APP_DIR/.env" ]; }; then
	as_root "mkdir -p '$APP_DIR' && chown $(id -u):$(id -g) '$APP_DIR' && if [ -f '$APP_DIR/.env' ]; then chown $(id -u):$(id -g) '$APP_DIR/.env'; fi"
fi
mkdir -p "$APP_DIR/backups"
as_root "mkdir -p '$APP_DIR/data/uploads' && chown -R 1000:1000 '$APP_DIR/data'"
install -m 644 "$HERE/docker-compose.prod.yml" "$APP_DIR/docker-compose.yml"
install -m 755 "$HERE/backup.sh" "$APP_DIR/backup.sh"
cd "$APP_DIR"

FIRST_INSTALL=false
if [ ! -f .env ]; then
	FIRST_INSTALL=true
	step "Prima instalare: creez baza de date și configurația"
	DB_PASSWORD=$(openssl rand -hex 24)
	# Utilizatorul și baza se creează doar dacă lipsesc; parola se (re)setează la valoarea nouă.
	docker exec -i "$DB_CONTAINER" sh -c 'psql -v ON_ERROR_STOP=1 -q -U "$POSTGRES_USER" -d postgres' >/dev/null <<-SQL
		do \$\$ begin
			if exists (select from pg_roles where rolname = 'meals') then
				alter role meals with login password '$DB_PASSWORD';
			else
				create role meals with login password '$DB_PASSWORD';
			end if;
		end \$\$;
		select 'create database meals owner meals' where not exists (select from pg_database where datname = 'meals') \gexec
	SQL
	umask 077
	cat > .env <<-EOF
		DATABASE_URL=postgres://meals:$DB_PASSWORD@$DB_SERVICE:5432/meals
		SHARED_NETWORK=$NETWORK
		APP_TZ=Europe/Chisinau
		BODY_SIZE_LIMIT=10M
		MEALS_IMAGE=$MEALS_IMAGE
	EOF
	if [ -n "${INITIAL_ADMIN_EMAIL:-}" ] && [ -n "${INITIAL_ADMIN_PASSWORD:-}" ]; then
		{
			# între apostrofuri, ca Docker Compose să nu interpreteze caractere ca $ sau #
			echo "INITIAL_ADMIN_EMAIL='$INITIAL_ADMIN_EMAIL'"
			echo "INITIAL_ADMIN_PASSWORD='$INITIAL_ADMIN_PASSWORD'"
			echo "INITIAL_ADMIN_NAME='${INITIAL_ADMIN_NAME:-Administrator}'"
		} >> .env
	else
		echo "ATENȚIE: INITIAL_ADMIN_EMAIL/INITIAL_ADMIN_PASSWORD lipsesc — primul cont se creează din pagina /setup, imediat după instalare."
	fi
	umask 022
	echo "baza de date: ok"
else
	step "Actualizez imaginea"
	sed -i "s#^MEALS_IMAGE=.*#MEALS_IMAGE=$MEALS_IMAGE#" .env
	grep -q '^SHARED_NETWORK=' .env || echo "SHARED_NETWORK=$NETWORK" >> .env
fi

step "Descarc și pornesc aplicația"
if [ -n "${GHCR_TOKEN:-}" ]; then
	# Autentificare temporară, într-o configurație Docker separată: nu atinge autentificările altor aplicații de pe server.
	PULL_CONFIG=$(mktemp -d)
	echo "$GHCR_TOKEN" | DOCKER_CONFIG=$PULL_CONFIG docker login ghcr.io -u "${GHCR_USER:-github}" --password-stdin >/dev/null
	DOCKER_CONFIG=$PULL_CONFIG docker compose pull --quiet
	rm -rf "$PULL_CONFIG"
else
	docker compose pull --quiet
fi
docker compose up -d --remove-orphans

step "Aștept ca aplicația să fie sănătoasă"
healthy=false
for _ in $(seq 1 30); do
	status=$(docker inspect -f '{{.State.Health.Status}}' meals-app 2>/dev/null || echo missing)
	if [ "$status" = healthy ]; then healthy=true; break; fi
	sleep 3
done
if [ "$healthy" != true ]; then
	docker logs --tail 40 meals-app 2>&1 | grep -v -i 'password\|postgres://' || true
	fail "aplicația nu a pornit corect (stare: $status)"
fi
echo "meals-app: healthy"

# După ce primul cont a fost creat, parola inițială nu mai trebuie păstrată pe disc.
if grep -q '^INITIAL_ADMIN_' .env; then
	sed -i '/^INITIAL_ADMIN_/d' .env
	echo "parola inițială a fost scoasă din .env"
fi

step "Configurez HTTPS în Caddy pentru $MEALS_DOMAIN"
SITE_FILE="$SITES_DIR/meals.caddy"
NEW_SITE=$(cat <<-EOF
	# Generat de deploy/install.sh (aplicația Mese)
	$MEALS_DOMAIN {
		encode zstd gzip
		request_body {
			max_size 10MB
		}
		reverse_proxy meals-app:3000
	}
EOF
)
if [ "$(cat "$SITE_FILE" 2>/dev/null || true)" != "$NEW_SITE" ]; then
	printf '%s\n' "$NEW_SITE" | docker run --rm -i -v "$SITES_DIR:/sites" alpine:3 sh -c 'cat > /sites/meals.caddy.new'
	docker run --rm -v "$SITES_DIR:/sites" alpine:3 sh -c 'cp /sites/meals.caddy /sites/meals.caddy.bak 2>/dev/null; mv /sites/meals.caddy.new /sites/meals.caddy'
	if ! docker exec "$CADDY_CONTAINER" caddy reload --config "$CADDY_CONFIG" >/dev/null 2>&1; then
		docker run --rm -v "$SITES_DIR:/sites" alpine:3 sh -c 'if [ -f /sites/meals.caddy.bak ]; then mv /sites/meals.caddy.bak /sites/meals.caddy; else rm -f /sites/meals.caddy; fi'
		docker exec "$CADDY_CONTAINER" caddy reload --config "$CADDY_CONFIG" >/dev/null 2>&1 || true
		fail "Caddy a refuzat configurația nouă; am revenit la cea anterioară"
	fi
	docker run --rm -v "$SITES_DIR:/sites" alpine:3 rm -f /sites/meals.caddy.bak
	echo "Caddy reîncărcat"
else
	echo "configurația Caddy e deja la zi"
fi

step "Gata"
$FIRST_INSTALL && echo "Prima instalare finalizată."
echo "Aplicația: https://$MEALS_DOMAIN"
