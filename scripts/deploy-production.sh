#!/usr/bin/env bash
set -Eeuo pipefail

readonly STACK_DIR="/home/nagato/apps/ma-cuisine"
readonly ROLLBACK_IMAGE="ma-cuisine-api:ci-rollback"
COMPOSE=(docker compose --env-file "$STACK_DIR/.env.production" -f "$STACK_DIR/docker-compose.prod.yml")

cd "$STACK_DIR"
exec 9>/tmp/ma-cuisine-deploy.lock
flock -w 900 9

had_previous=0
container_changed=0
if docker image inspect ma-cuisine-api:latest >/dev/null 2>&1; then
  docker tag ma-cuisine-api:latest "$ROLLBACK_IMAGE"
  had_previous=1
fi

rollback() {
  local exit_code=$?
  echo "Backend deployment failed; restoring the previous application image." >&2
  if [[ "$container_changed" -eq 1 && "$had_previous" -eq 1 ]]; then
    docker tag "$ROLLBACK_IMAGE" ma-cuisine-api:latest
    "${COMPOSE[@]}" up -d --no-deps --force-recreate api || true
  fi
  "${COMPOSE[@]}" logs --tail=150 api migrate || true
  exit "$exit_code"
}
trap rollback ERR

"${COMPOSE[@]}" build migrate api
"${COMPOSE[@]}" run --rm migrate
container_changed=1
"${COMPOSE[@]}" up -d --no-deps --force-recreate api

healthy=0
for _ in $(seq 1 45); do
  if curl --fail --silent --show-error --max-time 10 \
    https://api.justin.tadjo.dev/api/v1/health/ready >/dev/null; then
    healthy=1
    break
  fi
  sleep 2
done
[[ "$healthy" -eq 1 ]]

trap - ERR
if [[ "$had_previous" -eq 1 ]]; then
  docker image rm "$ROLLBACK_IMAGE" >/dev/null 2>&1 || true
fi
echo "Backend deployment completed successfully."
