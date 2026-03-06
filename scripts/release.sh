#!/usr/bin/env bash
set -euo pipefail

VERSION="${1:?Usage: ./scripts/release.sh 0.2.0}"

if ! [[ "$VERSION" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
  echo "Error: version must be semver (e.g., 0.2.0)" >&2
  exit 1
fi

echo "Bumping to v$VERSION..."

# package.json
npm version "$VERSION" --no-git-tag-version

# tauri.conf.json
jq --arg v "$VERSION" '.version = $v' src-tauri/tauri.conf.json > tmp.$$.json \
  && mv tmp.$$.json src-tauri/tauri.conf.json

# Cargo.toml (src-tauri only)
sed -i.bak "s/^version = \".*\"/version = \"$VERSION\"/" src-tauri/Cargo.toml
rm -f src-tauri/Cargo.toml.bak

# Sync both lockfiles
LOCKFILES=""
if command -v bun &>/dev/null; then
  bun install
  LOCKFILES="$LOCKFILES bun.lock"
fi
if command -v npm &>/dev/null; then
  npm install --package-lock-only
  LOCKFILES="$LOCKFILES package-lock.json"
fi

git add package.json $LOCKFILES src-tauri/tauri.conf.json src-tauri/Cargo.toml
git commit --no-verify -m "release: v$VERSION"
git tag -a "v$VERSION" -m "v$VERSION"
git push && git push origin "v$VERSION"

echo "Released v$VERSION"
