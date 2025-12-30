#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
cd "$ROOT_DIR"

ENV=production
if [[ ${1:-} == "dev" || ${1:-} == "development" ]]; then
  ENV=development
fi

echo "Using environment: $ENV"

# Helper to run wrangler with best available runner: local, npx, or npm exec
run_wrangler() {
  if command -v wrangler >/dev/null 2>&1; then
    wrangler "$@"
    return $?
  fi
  if command -v npx >/dev/null 2>&1; then
    npx wrangler "$@"
    return $?
  fi
  if command -v npm >/dev/null 2>&1; then
    npm exec -- wrangler "$@"
    return $?
  fi
  echo "Error: no available way to run wrangler (wrangler/npx/npm). Please install Node.js and wrangler." >&2
  return 2
}

# ensure at least one approach exists
if ! command -v wrangler >/dev/null 2>&1 && ! command -v npx >/dev/null 2>&1 && ! command -v npm >/dev/null 2>&1; then
  echo "Error: npx/npm/wrangler not found. Please install Node.js and npm (or wrangler)." >&2
  exit 1
fi

# Read DEEPSEEK_API_KEY from env or prompt
if [[ -z "${DEEPSEEK_API_KEY:-}" ]]; then
  echo -n "Enter DEEPSEEK_API_KEY (input hidden): "
  read -rs KEY
  echo
else
  KEY="$DEEPSEEK_API_KEY"
fi

if [[ -z "$KEY" ]]; then
  echo "No DEEPSEEK_API_KEY provided; aborting." >&2
  exit 1
fi

echo "Injecting DEEPSEEK_API_KEY into wrangler secrets for env=$ENV..."

# Check Cloudflare token for non-interactive environments
if [[ -z "${CF_API_TOKEN:-}" ]]; then
  echo "Warning: CF_API_TOKEN not set. You will be prompted to authenticate interactively if needed."
  echo "If you prefer non-interactive injection, export CF_API_TOKEN in your shell before running this script."
fi

# Use printf to avoid printing the key in logs; try run_wrangler which will pick appropriate runner
printf '%s' "$KEY" | run_wrangler secret put DEEPSEEK_API_KEY --env "$ENV"


echo "Secrets injected. Running deploy script..."

# Ensure CF_API_TOKEN is available in environment for wrangler
if [[ -z "${CF_API_TOKEN:-}" ]]; then
  echo "Warning: CF_API_TOKEN not set in env. wrangler deploy may require authentication." >&2
fi

# Run the project's deploy pipeline (Pages + Workers as configured in package.json)
npm run deploy

echo "Deployment finished."
