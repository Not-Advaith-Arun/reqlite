#!/usr/bin/env bash
set -euo pipefail

VERSION="${1:?Usage: ./scripts/generate-changelog.sh 0.2.0}"
API_KEY="${OPENROUTER_API_KEY:?OPENROUTER_API_KEY is required}"
MODEL="${OPENROUTER_MODEL:-openrouter/free}"

# Get previous tag
PREV_TAG=$(git describe --tags --abbrev=0 HEAD^ 2>/dev/null || echo "")

if [ -z "$PREV_TAG" ]; then
  COMMITS=$(git log --format="%s" --no-merges)
else
  COMMITS=$(git log "${PREV_TAG}..HEAD" --format="%s" --no-merges)
fi

if [ -z "$COMMITS" ]; then
  echo "## [${VERSION}] - $(date +%Y-%m-%d)"
  echo ""
  echo "No changes."
  exit 0
fi

TODAY=$(date +%Y-%m-%d)

SYSTEM_PROMPT='You are a changelog generator. Given git commit details, produce a clean changelog in markdown focused purely on what was achieved.

## Rules

1. **Group entries** into these categories (omit empty ones):
   - ### Added
   - ### Changed
   - ### Fixed
   - ### Removed
   - ### Security

2. **Classify** by analyzing commit messages:
   - feat/add/new/implement → Added
   - change/update/refactor/improve → Changed
   - fix/bug/patch/resolve → Fixed
   - remove/delete/drop → Removed
   - security/vuln/CVE → Security

3. **Rewrite each entry** as a short, clear, user-facing bullet point:
   - Strip all prefixes (feat:, fix:), scopes, ticket IDs, hashes, and author names
   - Focus on the outcome — what the user gains or what improved
   - Capitalize first word, no trailing period
   - Deduplicate entries describing the same change

4. **Version header**: Use `## [version] - YYYY-MM-DD` format with the version and date provided.

5. Skip merge commits. Order entries newest first within each category.

6. No emojis. No preamble. No explanation. Output only the markdown.'

USER_MSG="Version: ${VERSION}
Date: ${TODAY}

Commits:
${COMMITS}"

PAYLOAD=$(jq -n \
  --arg model "$MODEL" \
  --arg system "$SYSTEM_PROMPT" \
  --arg user "$USER_MSG" \
  '{
    model: $model,
    messages: [
      { role: "system", content: $system },
      { role: "user", content: $user }
    ],
    temperature: 0.3
  }')

RESPONSE=$(curl -s -X POST "https://openrouter.ai/api/v1/chat/completions" \
  -H "Authorization: Bearer ${API_KEY}" \
  -H "Content-Type: application/json" \
  -d "$PAYLOAD")

# Extract content, fallback to raw commits if API fails
CHANGELOG=$(echo "$RESPONSE" | jq -r '.choices[0].message.content // empty' 2>/dev/null)

if [ -z "$CHANGELOG" ]; then
  echo "## [${VERSION}] - ${TODAY}" >&2
  echo "" >&2
  echo "Failed to generate AI changelog. Raw response:" >&2
  echo "$RESPONSE" >&2
  # Fallback: just list commits
  echo "## [${VERSION}] - ${TODAY}"
  echo ""
  echo "### Changes"
  echo "$COMMITS" | while read -r line; do
    echo "- $line"
  done
  exit 0
fi

echo "$CHANGELOG"
