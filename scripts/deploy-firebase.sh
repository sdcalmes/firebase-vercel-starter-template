#!/usr/bin/env bash
# Deploy all Firebase backend: Firestore rules + indexes, Storage rules, Functions.
# Reads NEXT_PUBLIC_FIREBASE_PROJECT_ID from .env.prod in the repo root.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
ENV_FILE="$REPO_ROOT/.env.prod"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Error: $ENV_FILE not found. Create it with NEXT_PUBLIC_FIREBASE_PROJECT_ID=..." >&2
  exit 1
fi

PROJECT_ID=$(grep -E '^NEXT_PUBLIC_FIREBASE_PROJECT_ID=' "$ENV_FILE" | head -1 | cut -d'=' -f2 | tr -d '"' | tr -d "'")

if [[ -z "$PROJECT_ID" ]]; then
  echo "Error: NEXT_PUBLIC_FIREBASE_PROJECT_ID not found in $ENV_FILE." >&2
  exit 1
fi

echo "==> Firebase project: $PROJECT_ID"
cd "$REPO_ROOT"

echo "==> Building Cloud Functions..."
cd functions && npm run build && cd ..

echo "==> Deploying rules, indexes, storage, functions..."
bunx firebase deploy \
  --only firestore:rules,firestore:indexes,storage,functions \
  --project "$PROJECT_ID"

echo "==> Done."
