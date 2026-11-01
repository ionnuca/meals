#!/bin/sh
# Copie de siguranță zilnică pentru meals: baza de date + pozele.
# Exemplu cron (03:45): 45 3 * * * /opt/meals/backup.sh >> /opt/meals/backups/backup.log 2>&1
# Variabile necesare (în mediu sau în acest fișier, pe server): PG_CONTAINER, PG_USER
set -eu
DIR=/opt/meals/backups
STAMP=$(date +%Y-%m-%d)
mkdir -p "$DIR"
docker exec "${PG_CONTAINER:?}" pg_dump -U "${PG_USER:?}" -d meals -Fc > "$DIR/meals-$STAMP.dump"
tar -czf "$DIR/uploads-$STAMP.tar.gz" -C /opt/meals data/uploads
find "$DIR" -name 'meals-*.dump' -mtime +14 -delete
find "$DIR" -name 'uploads-*.tar.gz' -mtime +14 -delete
echo "$(date -Is) backup ok"
