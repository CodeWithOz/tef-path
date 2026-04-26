#!/usr/bin/env bash
set -euo pipefail

ENV_FILE="${1:-.env}"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "No $ENV_FILE found; skipping port checks."
  exit 0
fi

is_port_in_use() {
  local port="$1"

  if lsof -iTCP:"$port" -sTCP:LISTEN -n -P >/dev/null 2>&1; then
    return 0
  fi

  if docker ps --format '{{.Ports}}' 2>/dev/null | rg -q "[:.]${port}->"; then
    return 0
  fi

  return 1
}

read_env_value() {
  local key="$1"
  local line
  line="$(rg -n "^${key}=" "$ENV_FILE" -m 1 || true)"
  if [[ -z "$line" ]]; then
    echo ""
    return
  fi
  echo "${line#*:}" | sed "s/^${key}=//"
}

write_env_value() {
  local key="$1"
  local value="$2"
  if rg -q "^${key}=" "$ENV_FILE"; then
    perl -0pi -e "s/^${key}=.*\$/${key}=${value}/m" "$ENV_FILE"
  else
    printf "\n%s=%s\n" "$key" "$value" >>"$ENV_FILE"
  fi
}

find_available_port() {
  local current_port="$1"
  local increment="$2"
  local key="$3"

  local port="$current_port"
  while is_port_in_use "$port"; do
    port=$((port + increment))
  done

  if [[ "$port" != "$current_port" ]]; then
    echo "Updated $key: $current_port -> $port"
    write_env_value "$key" "$port"
  else
    echo "$key is available on $port"
  fi
}

replace_port_in_url_key() {
  local url_key="$1"
  local old_port="$2"
  local new_port="$3"

  local url_value
  url_value="$(read_env_value "$url_key")"
  if [[ -z "$url_value" ]]; then
    return
  fi

  local updated="${url_value/:${old_port}\//:${new_port}/}"
  if [[ "$updated" != "$url_value" ]]; then
    write_env_value "$url_key" "$updated"
  fi
}

# Add your project's port variables here as they are introduced.
PORT_KEYS=(
  "POSTGRES_PORT:1"
  "REDIS_PORT:1"
  "MINIO_API_PORT:2"
  "MINIO_CONSOLE_PORT:2"
)

for item in "${PORT_KEYS[@]}"; do
  key="${item%%:*}"
  increment="${item##*:}"
  value="$(read_env_value "$key")"
  if [[ -n "$value" && "$value" =~ ^[0-9]+$ ]]; then
    previous="$value"
    find_available_port "$value" "$increment" "$key"
    current="$(read_env_value "$key")"
    if [[ "$key" == "POSTGRES_PORT" && "$current" != "$previous" ]]; then
      replace_port_in_url_key "DATABASE_URL" "$previous" "$current"
    fi
  fi
done

echo "Port check complete."
