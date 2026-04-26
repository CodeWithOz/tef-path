#!/usr/bin/env bash
set -euo pipefail

if [[ ! -f "docker-compose.yml" && ! -f "docker-compose.yaml" ]]; then
  echo "No docker-compose file found; skipping container startup."
  exit 0
fi

if ! command -v docker >/dev/null 2>&1; then
  echo "Docker is not installed; skipping container startup."
  exit 0
fi

if ! docker info >/dev/null 2>&1; then
  echo "Docker daemon is not running; skipping container startup."
  exit 0
fi

short_sha="$(git rev-parse --short HEAD 2>/dev/null || echo "nosha")"
folder_name="$(basename "$PWD" | tr -cs 'a-zA-Z0-9' '-')"
count=1
max_attempts=10

while [[ $count -le $max_attempts ]]; do
  project_name="tef-${short_sha}-${count}-${folder_name}"
  echo "Trying docker compose project: $project_name"

  if docker compose -p "$project_name" up -d; then
    echo "Docker services started successfully with project: $project_name"
    exit 0
  fi

  echo "Compose startup failed; retrying with a new project suffix..."
  count=$((count + 1))
done

echo "Unable to start docker compose after ${max_attempts} attempts."
exit 1
