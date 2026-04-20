#!/usr/bin/env bash
# Deploy only Firestore + Storage security rules.
# Reads NEXT_PUBLIC_FIREBASE_PROJECT_ID from .env.prod in the repo root.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
ENV_FILE="$REPO_ROOT/.env.prod"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Error: $ENV_FILE not found." >&2
  exit 1
fi

PROJECT_ID=$(grep -E '^NEXT_PUBLIC_FIREBASE_PROJECT_ID=' "$ENV_FILE" | head -1 | cut -d'=' -f2 | tr -d '"' | tr -d "'")

if [[ -z "$PROJECT_ID" ]]; then
  echo "Error: NEXT_PUBLIC_FIREBASE_PROJECT_ID not found in $ENV_FILE." >&2
  exit 1
fi

echo "Deploying rules to Firebase project: $PROJECT_ID"
cd "$REPO_ROOT"
bunx firebase deploy --only firestore:rules,storage --project "$PROJECT_ID"

echo "Done."
