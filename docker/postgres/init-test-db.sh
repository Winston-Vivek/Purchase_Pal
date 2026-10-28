#!/bin/sh
# Creates the second database used by the API e2e suite (docs/test-plan.md §5).
#
# Postgres runs everything in /docker-entrypoint-initdb.d exactly once, when the
# data volume is empty. If you ever need to re-run it: docker compose down -v.
set -e

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
	CREATE DATABASE proofly_test;
	GRANT ALL PRIVILEGES ON DATABASE proofly_test TO $POSTGRES_USER;
EOSQL

echo "init: created database proofly_test"
