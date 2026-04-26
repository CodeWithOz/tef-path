#!/usr/bin/env bash
set -euo pipefail

if rg -q "\"prisma\"" package.json; then
  echo "Prisma detected; running migrations."
  npx prisma migrate dev
  exit 0
fi

if rg -q "\"drizzle" package.json; then
  echo "Drizzle detected; running push/migrate script."
  if npm run | rg -q "db:(push|migrate)"; then
    npm run db:migrate || npm run db:push
    exit 0
  fi
fi

echo "No supported migration workflow detected; skipping DB migration."
